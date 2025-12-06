import { MongoClient, MongoClientOptions } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
    throw new Error('Please add your MONGODB_URI to .env.local');
}

const options: MongoClientOptions = {};

// Declare a type for the global object to hold our cached promise
// This prevents TypeScript errors when accessing a custom property like `_mongoClientPromise`
declare global {
    var _mongoClientPromise: Promise<MongoClient>;
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable to preserve the client promise
    // across module reloads caused by HMR.
    if (!global._mongoClientPromise) {
        client = new MongoClient(uri, options);
        global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
} else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
}

async function getCollection(collection_name: string) {
    const client = await clientPromise;
    const db = client.db('async');
    return db.collection(collection_name);
}

// Export a module-scoped MongoClient promise.
// This client promise can be imported and awaited in your Next.js API routes or Server Actions.
export { clientPromise, getCollection };
