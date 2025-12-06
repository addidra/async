// import { ObjectId } from "mongodb";

// interface User {
//     clerkId: string;
//     username: string;
//     email: string;
//     createdAt: Date;
//     updatedAt: Date;
// }

// interface Integration {
//     userId: ObjectId
//     provider: string;
//     orgId: string | null;
//     connected: boolean;
//     createdAt: Date;
// }

// interface IntegrationCredential {
//     integrationId: ObjectId;
//     clientIdEnc: string;
//     clientSecretEnc: string;
//     refreshTokenEnc: string;
//     accessTokenEnc: string;
//     tokenExpiry: Date;
//     createdAt: Date;
//     updatedAt: Date;
// }

// interface Module {
//     integrationId: ObjectId;
//     module: string;
//     active: boolean;
//     fieldsToExtract: string[];
//     createdAt: Date;
//     updatedAt: Date;
// }

// export type { User, Integration, IntegrationCredential, Module };