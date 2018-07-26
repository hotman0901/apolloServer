const {
    ApolloServer,
    gql,
    AuthenticationError,
    UserInputError,
    PubSub
} = require('apollo-server');
const fetch = require('isomorphic-fetch');

const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');
const _ = require('lodash');

// 訂閱
const pubsub = new PubSub();
const SOMETHING_CHANGED_TOPIC = 'something_changed';

// This is a (sample) collection of books we'll be able to query
// the GraphQL server for.  A more complete example might fetch
// from an existing data source like a REST API or database.
const books = [
    {
        title: 'Harry Potter and the Chamber of Secrets',
        author: 'J.K. Rowling'
    },
    {
        title: 'Jurassic Park',
        author: 'Michael Crichton'
    }
];

// Type definitions define the "shape" of your data and specify
// which ways the data can be fetched from the GraphQL server.
const typeDefs = gql`
    # Comments in GraphQL are defined with the hash (#) symbol.

    # This "Book" type can be used in other type declarations.
    type Book {
        title: String
        author: String
    }

    # The "Query" type is the root of all GraphQL queries.
    # (A "Mutation" type will be covered later on.)
    type Query {
        books: [Book]
        booksTitle(title: String!): [Book]
        hello: String
        mockedString: String
        readError: String
        authenticationError: String
        scalarBooks(title: Date!): Comment
    }

    type Mutation {
        userInputError(input: String): String
    }

    # 訂閱
    type Subscription {
        newMessage: String
    }

    type Post {
        author: String
        comment: String
    }

    # 自定義型態
    scalar Date

    type Comment {
        id: Int
        createDate: Date
    }
`;

// 測試scalar資料用
const scalarDateList = {
    id: 99,
    createDate: 153250252999
}

// Resolvers define the technique for fetching the types in the
// schema.  We'll retrieve books from the "books" array above.
const resolvers = {
    // 訂閱
    Subscription: {
        newMessage: {
            subscribe: () => pubsub.asyncIterator(SOMETHING_CHANGED_TOPIC)
        }
    },
    Query: {
        books: () => {
            return books;
        },
        booksTitle: (parent, args, context, info) => {
            console.log('================context共用參數===================');
            console.log(context);
            console.log('================context共用參數====================');
            return books.filter(obj => {
                return obj.title === args.title;
            });
        },
        hello: () =>
            fetch('https://fourtonfish.com/hellosalut/?mode=auto')
                .then(res => res.json())
                .then(data => data.hello),
        readError: (parent, args, context) => {
            fs.readFileSync('/does/not/exist');
        },
        // 登入error
        authenticationError: (parent, args, context) => {
            throw new AuthenticationError('must authenticate');
        },
        scalarBooks: (parent, args, context, info) => {
            // 有透過parseLiteral 更新過
            console.log('args:', args)
            return scalarDateList;
        }
    },
    Mutation: {
        // 輸入erroe
        userInputError: (parent, args, context, info) => {
            if (args.input !== 'expected') {
                throw new UserInputError('Form Arguments invalid', {
                    invalidArgs: Object.keys(args)
                });
            }
        }
    },

    // 自定義型態用
    Date: new GraphQLScalarType({
        name: 'Date',
        description: 'Date custom scalar type',
        // 還不曉得這個功能
        parseValue(value) {
            console.log('================1====================')
            console.log(value)
            console.log('================1====================')
            return new Date();
        },
        // serialize 將資料輸出給clinet端
        serialize(value) {
            // db 資料，可以先在這了做formate船回到client端
            console.log('================2====================')
            console.log(value)
            console.log('=================2===================')
            if (_.isString(value) && /^\d*$/.test(value)) {
                return parseInt(value, 0);
            } else if (_.isInteger(value)) {
                return value;
            }
            return value;
        },
        parseLiteral(ast) {
            // 只要參數有這個type 就會跑近來
            // 這裡會取得在前端發送的參數
            console.log('================3====================')
            console.log(ast)
            console.log('================3===================')
            // 這裡是可以update client端輸入的參數
            // update過後的就會直接更新到args的參數
            if (ast.kind === Kind.INT) {
                return new Date(parseInt(ast.value, 10));
            }
            return null;
        }
    }),
};

// In the most basic sense, the ApolloServer can be started
// by passing type definitions (typeDefs) and the resolvers
// responsible for fetching the data for those types.
const server = new ApolloServer({
    typeDefs,
    resolvers,
    formatError: error => {
        console.log(error);
        return new Error('Internal server error');
    },
    formatResponse: response => {
        console.log('formatResponse:', response);
        return response;
    },
    // 共用變數，之後傳遞到resolver內的context
    context: ({ req }) => ({
        authScope: 'yayayayayay'
    }),
    playground: {
        settings: {
            'editor.theme': 'dark'
        }
    },
    // introspection: false,
    // playground: false
});

// This `listen` method launches a web-server.  Existing apps
// can utilize middleware options, which we'll discuss later.
server.listen().then(({ url }) => {
    console.log(`🚀  Server ready at ${url}`);
});

// 測試訂閱用
setInterval(
    () =>
        pubsub.publish(SOMETHING_CHANGED_TOPIC, {
            newMessage: new Date().toString()
        }),
    1000
);
