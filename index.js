const { ApolloServer, gql, UserInputError } = require('apollo-server')
const { v1: uuid } = require('uuid')

const mongoose = require('mongoose')
const Author = require('./models/Author.js')
const Book = require('./models/Book.js')
const User = require('./models/User.js')
const { hash, authorize, auth } = require('./libs/auth.js')

let authors = [
  {
    name: 'Robert Martin',
    id: "afa51ab0-344d-11e9-a414-719c6709cf3e",
    born: 1952,
  },
  {
    name: 'Martin Fowler',
    id: "afa5b6f0-344d-11e9-a414-719c6709cf3e",
    born: 1963
  },
  {
    name: 'Fyodor Dostoevsky',
    id: "afa5b6f1-344d-11e9-a414-719c6709cf3e",
    born: 1821
  },
  { 
    name: 'Joshua Kerievsky', // birthyear not known
    id: "afa5b6f2-344d-11e9-a414-719c6709cf3e",
  },
  { 
    name: 'Sandi Metz', // birthyear not known
    id: "afa5b6f3-344d-11e9-a414-719c6709cf3e",
  },
]

/*
 * Suomi:
 * Saattaisi olla järkevämpää assosioida kirja ja sen tekijä tallettamalla kirjan yhteyteen tekijän nimen sijaan tekijän id
 * Yksinkertaisuuden vuoksi tallennamme kuitenkin kirjan yhteyteen tekijän nimen
 *
 * English:
 * It might make more sense to associate a book with its author by storing the author's id in the context of the book instead of the author's name
 * However, for simplicity, we will store the author's name in connection with the book
 *
 * Spanish:
 * Podría tener más sentido asociar un libro con su autor almacenando la id del autor en el contexto del libro en lugar del nombre del autor
 * Sin embargo, por simplicidad, almacenaremos el nombre del autor en conección con el libro
*/

let books = [
  {
    title: 'Clean Code',
    published: 2008,
    author: 'Robert Martin',
    id: "afa5b6f4-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring']
  },
  {
    title: 'Agile software development',
    published: 2002,
    author: 'Robert Martin',
    id: "afa5b6f5-344d-11e9-a414-719c6709cf3e",
    genres: ['agile', 'patterns', 'design']
  },
  {
    title: 'Refactoring, edition 2',
    published: 2018,
    author: 'Martin Fowler',
    id: "afa5de00-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring']
  },
  {
    title: 'Refactoring to patterns',
    published: 2008,
    author: 'Joshua Kerievsky',
    id: "afa5de01-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring', 'patterns']
  },  
  {
    title: 'Practical Object-Oriented Design, An Agile Primer Using Ruby',
    published: 2012,
    author: 'Sandi Metz',
    id: "afa5de02-344d-11e9-a414-719c6709cf3e",
    genres: ['refactoring', 'design']
  },
  {
    title: 'Crime and punishment',
    published: 1866,
    author: 'Fyodor Dostoevsky',
    id: "afa5de03-344d-11e9-a414-719c6709cf3e",
    genres: ['classic', 'crime']
  },
  {
    title: 'The Demon ',
    published: 1872,
    author: 'Fyodor Dostoevsky',
    id: "afa5de04-344d-11e9-a414-719c6709cf3e",
    genres: ['classic', 'revolution']
  },
]

const MONGODB_URI = 'mongodb+srv://temp_admin:tempadmin123@kalkuzdb.jpgfnzm.mongodb.net/test?retryWrites=true&w=majority'

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('connected to MongoDB')
  })
  .catch((error) => {
    console.log('error connection to MongoDB:', error.message)
  })

const typeDefs = gql`
  type Author {
    name: String!
    id: ID!
    born: Int
    bookCount: Int
  }

  type Book {
    title: String!
    published: Int!
    author: Author!
    genres: [String!]!
    id: ID!
  }

  type User {
    username: String!
    favouriteGenre: String!
    id: ID!
  }
  
  type Token {
    value: String!
  }

  type Query {
    allBooks(genre: String, author: String): [Book!]!
    findBook(title: String, author: String): Book!
    countBooks: Int!

    allAuthors: [Author!]!
    findAuthor(name: String): Author!
    countAuthors: Int!

    me: User
  }

  type Mutation {
    addBook(
      title: String!
      author: String!
      published: Int!
      genres: [String!]!
    ): Book!
    editAuthor(name: String!, setBornTo: Int!): Author

    createUser(
      username: String!
      password: String!
      favouriteGenre: String!
    ): User
    login(
      username: String!
      password: String!
    ): Token
  }
`

const resolvers = {
  Query: {
    // allBooks: (root, { author, genre }) => books.filter((b) => 
    //   (genre ? b.genres?.includes(genre) : true) &&
    //   (author ? b.author === author : true)
    // ),
    allBooks: async (root, { author, genre }) => {
      if(author){
        if (author.length < 4){
          throw new UserInputError("Author name should not be that short", {
            invalidArgs: author,
          })
        }
      }
      const _author = await Author.findOne({ name: author });

      const bookQuery = {};
      if(_author) {
        bookQuery["author"] = _author._id 
      };
      if(genre) {
        if (genre.length < 3){
          throw new UserInputError("Genre should not be that short", {
            invalidArgs: genre,
          })
        }

        bookQuery["genres"] = { $elemMatch: { $eq: genre } }
      };

      const books = await Book.find(bookQuery).populate("author");
      return books;
    },
    // findBook: (root, { title, author }) => books.find(b => 
    //   (title ? b.title === title : true) &&
    //   (author ? b.author === author : true)
    // ),
    findBook: async (root, { title, author }) => {
      let match = {};
      if (title) { 
        if (title.length < 2){
          throw new UserInputError("Title should not be that short", {
            invalidArgs: title,
          })
        }
        match["title"] = title;
      }
      if (author) {
        if (author.length < 4){
          throw new UserInputError("Author name should not be that short", {
            invalidArgs: author,
          })
        }
        match["author.name"] = author; 
      }

      const doc = await Book
        .aggregate([
          { 
            $lookup: {
            from: "authors",
            localField: "author",
            foreignField: "_id",
            as: "author"
          }},
          { $unwind: "$author" },
          { $match: match },
          { $limit: 1 }
        ])

      return doc[0];
    },
    countBooks: async () => Book.collection.countDocuments(),
    
    // allAuthors: () => authors.map((a) => ({ ...a, bookCount: books.filter((b) => b.author === a.name).length })),
    allAuthors: async () => {
      const authors = await Author.find({});
      return authors;
    },
    // findAuthor: (root, { name }) => authors.find(a => a.name === name),
    findAuthor: async (root, { name }) => {
      if (name.length < 3){
        throw new UserInputError("Name should not be that short", {
          invalidArgs: name,
        });
      }
      const author = await Author.findOne({ name });
      return author;
    },
    countAuthors: async () => Author.collection.countDocuments(),
  },
  Mutation: {
    // addBook: (root, args) => {
    //   const book = { ...args, id: uuid() }

    //   if (!authors.find((a) => a.name === args.author)){
    //     const author = { name: args.author, id: uuid() }
    //     authors = authors.concat(author);
    //   }

    //   books = books.concat(book)
    //   return book
    // },
    createUser: async (root, { username, password, favouriteGenre }) => {
      const user = await User.findOne({ username });
      if(user) {
        throw new Error(`User ${username} already exists`);
      }

      const usr = await User.create({ username, password, favouriteGenre });
      return usr;
    },
    login: async (root, {username, password}) => {
      const user = await User.findOne({ username });

      if(hash(password) === user.password){
        console.log(user.id);
        return {value: authorize(user.id, user.type)};
      }
      else {
        throw new Error('E-Mail or Password wrong');
      }
    },
    addBook: async (root, args, usr) => {
      if(!usr) throw new Error('You are not allowed in here');

      let author = await Author.findOne({ name: args.author });
      if (!author){
        author = await Author.create({ name: args.author });
      }

      const book = await Book.create({ ...args, author: author._id });
      
      return await book.populate("author");
    },
    // editAuthor: (root, { name, setBornTo }) => {
    //   authors = authors.map((a) => (a.name === name ? { ...a, born: setBornTo } : a));
    //   return authors;
    // }
    editAuthor: async (root, { name, setBornTo }, usr) => {
      if(!usr) throw new Error('You are not allowed in here');

      const updated = await Author.findOneAndUpdate({ name }, { born: setBornTo }, { new: true });
      return updated;
    }
  }, 
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const ath = req ? req.headers.authorization : null
    if (ath && ath.toLowerCase().startsWith('bearer ')) {
      const token = ath.substring(7);
      const usrid = auth(token);
      const user =  await User.findOne({ _id: usrid });
      return user.toJSON();
    }
  }
})

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`)
})