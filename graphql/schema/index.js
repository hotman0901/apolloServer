const Book = require('./books');
const Query = require('./query');
const resolvers = require('./resolvers');
const { makeExecutableSchema } = require('graphql-tools');
const schema = makeExecutableSchema({
    typeDefs: [Book, Query],
    resolvers
});

module.exports = schema;
