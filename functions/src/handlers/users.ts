import { db, fbStorage } from "../util/admin";
import { isValidEmail, isValidPassword, isValidHandle, isEmpty } from "../helper/validateAuthInputs"
import { auth } from 'firebase';
import { Request, Response } from "firebase-functions";
import * as Busboy from "busboy";
import { firebaseConfig } from "../configs/firebaseConfig";
import { reduceUserdetails } from "../helper/reduceUserDetailsAndValidate";

// @ts-ignore
export const signIn = (request: Request, response: Response) => {
    const user = {
        email: request.body.email,
        password: request.body.password
    }

    if (!isValidEmail(user.email)) {
        return response.status(400).json({ errorType: "inputError", inputElement: "email", message: `Invalid Email` });
    } else if (isEmpty(user.password)) {
        return response.status(400).json({ errorType: "inputError", inputElement: "password", message: `Invalid Password` });
    } else {
        auth().signInWithEmailAndPassword(user.email, user.password)
            .then((data) => {
                return data.user?.getIdToken()
            })
            .then((token) => {
                return response.status(200).json({ token, message: `sign in success` });
            })
            .catch((error) => {
                if (error.code === "auth/wrong-password") {
                    return response.status(400).json({ errorType: "authError", message: "Incorrect Password" });
                } else if (error.code === "auth/user-not-found") {
                    return response.status(400).json({ errorType: "authError", message: "Incorrect Email" });
                } else {
                    return response.status(500).json({ message: error.code });
                }
            })
    }
}

// @ts-ignore
export const signUp = (request: Request, response: Response) => {
    const newUser = {
        email: request.body.email,
        password: request.body.password,
        confirmPassword: request.body.confirmPassword,
        userHandle: request.body.userHandle,
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/no-image.jpg?alt=media`
    }

    var token: string, userId: string;

    if (!isValidEmail(newUser.email)) {
        return response.status(400).json({ errorType: "inputError", inputElement: "email", message: `Invalid Email` });
    } else if (!isValidPassword(newUser.password, newUser.confirmPassword)) {
        return response.status(400).json({ errorType: "inputError", inputElement: "password", message: `Empty Password / passwords do not match` });
    } else if (!isValidHandle(newUser.userHandle)) {
        return response.status(400).json({ errorType: "inputError", inputElement: "userHandle", message: `Handle Cannot Be Empty` });
    }
    else {
        db.doc(`users/${newUser.userHandle}`).get()
            // @ts-ignore
            .then((doc) => {
                if (doc.exists) {
                    return response.status(400).json({ errorType: "handleTakenError", message: `user handle is taken, user create failure` });
                } else {
                    return auth().createUserWithEmailAndPassword(newUser.email, newUser.password)
                }
            })
            .then(userData => {
                // @ts-ignore
                userId = userData.user.uid;
                // @ts-ignore
                return userData.user.getIdToken();
            })
            .then(idToken => {
                token = idToken;
                const userCreds = {
                    email: newUser.email,
                    createdAt: new Date().toISOString(),
                    userHandle: newUser.userHandle,
                    userId,
                    imageUrl: newUser.imageUrl
                }
                // save registered user to users collection in firestore 
                return db.doc(`users/${newUser.userHandle}`).set(userCreds);
            })
            .then(() => {
                return response.status(200).json({ token, message: `user create success` })
            })
            .catch((error) => {
                console.error(error);
                if (error.code === "auth/email-already-in-use") {
                    return response.status(400).json({ errorType: "emailTakenError", message: `email already in use` });
                } else {
                    return response.status(500).json({ errorType: "unknownError", message: error.code });
                }
            })
    }
}

export const uploadImage = (request: Request, response: Response) => {
    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    const busboy = new Busboy({ headers: request.headers });

    let imageFileName = "";
    let imageToBeUploaded = { filePath: "", mimetype: "" };

    // @ts-ignore
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {

        console.log(`uploading ${filename}, ${mimetype}`);

        if (mimetype !== "image/png" && mimetype !== "image/jpg" && mimetype !== "image/jpeg") {
            return response.status(400).json({ "message": "invalid file extension" })
        }

        const imageExtension = path.extname(filename);
        imageFileName = `${Math.round(Math.random() * 10000000000)}${imageExtension}`;
        const filePath = path.join(os.tmpdir(), imageFileName);
        imageToBeUploaded = { filePath, mimetype };

        file.pipe(fs.createWriteStream(filePath));
    });

    busboy.on("finish", () => {
        fbStorage.bucket().upload(imageToBeUploaded.filePath, {
            resumable: false,
            metadata: {
                metadata: {
                    contentType: imageToBeUploaded.mimetype
                }
            }
        })
            .then(() => {
                const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${firebaseConfig.storageBucket}/o/${imageFileName}?alt=media`;
                // @ts-ignore since this is authorized call, it'll have user object in request
                return db.doc(`/users/${request.user.userHandle}`).update({ imageUrl });
            })
            .then(() => {
                return response.status(200).json({ message: "image upload success" });
            })
            .catch((error: any) => {
                return response.status(500).json({ message: error.code })
            })
    })


    // @ts-ignore
    busboy.end(request.rawBody);

}

export const addUserDetails = (request: Request, response: Response) => {
    const userDetails:{} = reduceUserdetails(request.body);

    console.log(`user details are here`);
    console.log(userDetails);
    // @ts-ignore
    db.doc(`/users/${request.user.userHandle}`).update(userDetails)
    .then(()=>{
        return response.status(200).json({'message':"user details update success"});
    })
    .catch((error:any)=>{
        console.error(error)
        return response.status(500).json({'message':error.code});
    })
}

export const getAuthenticatedUserDetails = (request: Request, response: Response) => {
    let userData:any={}
    // @ts-ignore
    db.doc(`/users/${request.user.userHandle}`).get()
    // @ts-ignore
    .then((doc:any)=>{
        userData.credentials = {};
        if(doc.exists){
            userData.credentials = doc.data();
            // @ts-ignore
            return db.collection(`likes`).where("userHandle",'==',request.user.userHandle).get()
        }else{
            return response.status(400).json({"message":"user doesn't exist"});
        }
    })
    .then((data:any) => {
        userData.likes = []
        data.forEach((doc:any) => {
            userData.likes.push(doc.data());
        })
        return response.status(200).json(userData);
    })
    .catch((error) => {
        console.error(error);
        return response.status(500).json({'message':error.code});
    })
}