// has function for auth middleware, authenticates token for secured routes

import { db } from "../util/admin";
import { admin } from "./admin";

export const FBAuth = (request: any, response: any, next: any) => {
    let idToken;
    if (request.headers.authorization && request.headers.authorization.startsWith('Bearer ')) {
        idToken = request.headers.authorization.split(" ")[1];
    } else {
        return response.status(403).json({ message: `Unauthorized` });
    }

    admin.auth().verifyIdToken(idToken)
        .then((decodedToken:any) => {
            request.user = decodedToken;
            console.log(decodedToken);
            return db.collection('users')
            .where(`userId`, '==', decodedToken.uid )
            .limit(1)
            .get()
        })
        .then((docsRef: any)=> {
            console.log(docsRef);
            request.user.userHandle = docsRef.docs[0].data().userHandle;
            request.user.imageUrl = docsRef.docs[0].data().imageUrl;
            console.log(JSON.stringify(docsRef.docs[0].data()));
            request.body.userHandle = docsRef.docs[0].data().userHandle;
            return next();    
        })
        .catch((error: any) => {
            return response.status(403).json(error)
        });
}