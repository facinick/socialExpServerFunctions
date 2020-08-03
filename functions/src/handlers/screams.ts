// @ts-nocheck
import { db, admin } from "../util/admin";
import { Request, Response } from "firebase-functions";
const functions = require("firebase-functions");

var firestore = admin.firestore();

export const getAllScreams = (request:Request, response:Response) => {
    db.collection("screams")
    .orderBy('createdAt', 'desc')
    .get()
    .then(function (querySnapshot) {
        let screams: any[] = [];
        querySnapshot.forEach(function (doc) {
            screams.push({
                screamId: doc.id,
                ...doc.data()
            })
            // doc.data() is never undefined for query doc snapshots
            console.log(doc.id, " => ", doc.data());
        });
        response.json(screams);
    })
    .catch((error: any) => {
        console.log(error);
    })
}

export const postOneScream = (request:Request, response:Response) => {
    const newScream = {
        body: request.body.body,
        // @ts-ignore
        userHandle: request.body.userHandle,
        createdAt: new Date().toISOString(),
        nLikes: 0,
        nComments: 0
    }
    db
        .collection('screams')
        .add(newScream)
        .then((doc) => {
            const new_scream = newScream;
            new_scream.screamId = doc.id;
            response.status(200).json(new_scream);
        })
        .catch((error: any) => {
            response.status(500).json({ message: `document create error` })
        });
}

export const getScream = (request:Request, response:Response) => {
    // let screamData = {};
    let screamData:any = {};
    db.doc(`screams/${request.params.screamId}`)
    .get()
    // @ts-ignore
    .then(function (querySnapshot) {
        if(!querySnapshot.exists){
            return response.status(404).json({"message":"scream not found"})
        }else{
            screamData = querySnapshot.data();
            screamData.screamId = querySnapshot.id;
            return db.collection(`comments`)
            // .orderBy(`createdAt`, `desc`)
            .where(`screamId`, `==`, request.params.screamId)
            .get() 
        }
    })
    .then((querySnapshot) => {
        screamData.comments=[]
        // @ts-ignore
        querySnapshot.forEach(function (doc) {
            screamData.comments.push(
                doc.data()
            )
        });
        return response.status(200).json(screamData);
    })
    .catch((error) => {
        return response.status(500).json({message:error.code});
    })
    .catch((error: any) => {
        console.log(error);
    })
}

export const addComment = (request:Request, response:Response) => {

    if(request.body.body.trim() === ""){
        return response.status(400).json({"message":"comment must not be empty"})
    }

    const newComment = {
        body: request.body.body.trim(),
        createdAt: new Date().toISOString(),
        screamId: request.params.screamId,
        userHandle: request.user.userHandle,
        imageUrl: request.user.imageUrl,
    }

    const screamDocumentRef = db.doc(`screams/${request.params.screamId}`);
    let screamDocumentData;

    screamDocumentRef
    .get()
    .then(function (documentSnapshot) {
        if(!documentSnapshot.exists){
            return response.status(404).json({"message":"scream not found"})
        }else{
            screamDocumentData = documentSnapshot.data();
            return db.collection(`comments`).add(newComment)
        }
    })
    .then(()=>{
        // TODO: make this atomic
        return screamDocumentRef.update({nComments: screamDocumentData.nComments + 1})
    })
    .then(() => {
        response.status(200).json(newComment);
    })
    .catch((error) => {
        console.log(error)
        return response.status(500).json({message:error.code});
    })
}

export const deleteScream = (request:Request, response:Response) => {

    const screamDocumentRef = db.doc(`screams/${request.params.screamId}`);
    let screamDocumentid;

    screamDocumentRef.get()
        .then(documentSnapshot => {
            if(!documentSnapshot.exists){
                return response.status(404).json({"message":"scream not found"})
            }
            // think whyyyyyyyyyy brossssss why didnt we do this till now???
            if(documentSnapshot.data().userHandle!== request.user.userHandle){
                return response.status(400).json({"message":"unauthorized access to delete a scream you asshole"});
            }
            else{
                screamDocumentid = documentSnapshot.id;
                return screamDocumentRef.delete();
            }
        })
        .then(()=> {
            return db.collection('likes').where('screamId','==',screamDocumentid).get();
        })
        .then(function(querySnapshot) {
            var batch = db.batch();
            querySnapshot.forEach(function(doc) {
                batch.delete(doc.ref);
            });
            return batch.commit();
        })
        .then(()=> {
            return db.collection('comments').where('screamId','==',screamDocumentid).get();
        })
        .then(function(querySnapshot) {
            var batch = db.batch();
            querySnapshot.forEach(function(doc) {
                batch.delete(doc.ref);
            });
            return batch.commit();
        })
        .then(() => {
            response.status(200).json({"message":"scream delete success, with likes and comments"});
        })
        .catch((error) => {
            console.log(error)
            return response.status(500).json({message:error.code});
        })
}

export const upVote = (request:Request, response:Response) => {

    const likeQueryRef = db.collection(`likes`).where('screamId', '==', request.params.screamId).where('userHandle', '==', request.user.userHandle).limit(1);
    const upVoteScreamDocumentRef = db.doc(`screams/${request.params.screamId}`)
    
    let screamData;
    let likeData;

    let likeDocumentRefArray: any[] = []; 
    let likeDocumentRefid: number; 

    upVoteScreamDocumentRef.get()
    .then(function (documentSnapshot) {
        if(!documentSnapshot.exists){
            return response.status(404).json({"message":"scream not found"})
        }else{
            screamData = documentSnapshot.data();
            screamData.screamId = documentSnapshot.id;
            return likeQueryRef.get();
        }
    })
    .then((querySnapshot) => {

        likeData = {};
        likeData.screamId =  request.params.screamId;
        likeData.userHandle = request.user.userHandle;
        let voteValue;

        if(!querySnapshot.empty){
            querySnapshot.forEach(function (doc) {
                likeDocumentRefArray.push(doc)
            });
            voteValue = likeDocumentRefArray[0].data().value;
            functions.logger.log("Vote:", voteValue);
        }else{
            voteValue = 0;
        }

        console.log(`query snapshot exists: ${!querySnapshot.empty}`);
        console.log(`before Upvote: ${voteValue}`);

        switch(voteValue){
            case 1:
                return response.status(400).json({"message":"already upvoted"});
            case 0:
                screamData.nLikes = screamData.nLikes + 1;
                likeData.value = 1;
                break;
            case -1:
                screamData.nLikes = screamData.nLikes + 2;
                likeData.value = 1;
                break;
            default:
                return response.status(500).json({"message":"server has invalid vote value"});
        }

        if(querySnapshot.empty){
            return db.collection(`likes`).add(likeData)
            .then(() => {
                return upVoteScreamDocumentRef.update({nLikes:screamData.nLikes});
            })
            .then(()=>{
                return response.json(screamData);
            })
        }
        else{            
            db.collection("likes").doc(likeDocumentRefArray[0].id).update({value:likeData.value})
            .then(() => {
                return upVoteScreamDocumentRef.update({nLikes:screamData.nLikes});
            })
            .then(()=>{
                return response.json(screamData);
            })
            
        }
    })
    .catch((error) => {
        functions.logger.log("Error", error);
        return response.status(500).json({message:error.code});
    })
}

export const downVote = (request:Request, response:Response) => {
    const likeQueryRef = db.collection(`likes`).where('screamId', '==', request.params.screamId).where('userHandle', '==', request.user.userHandle).limit(1);
    const downVoteScreamDocumentRef = db.doc(`screams/${request.params.screamId}`)
    
    let screamData;
    let likeData;

    let likeDocumentRefArray: any[] = []; 

    downVoteScreamDocumentRef.get()
    .then(function (documentSnapshot) {
        if(!documentSnapshot.exists){
            return response.status(404).json({"message":"scream not found"})
        }else{
            screamData = documentSnapshot.data();
            screamData.screamId = documentSnapshot.id;
            return likeQueryRef.get();
        }
    })
    .then((querySnapshot) => {

        likeData = {};
        likeData.screamId =  request.params.screamId;
        likeData.userHandle = request.user.userHandle;
        let voteValue;

        if(!querySnapshot.empty){
            querySnapshot.forEach(function (doc) {
                likeDocumentRefArray.push(doc)
            });
            voteValue = likeDocumentRefArray[0].data().value;
            functions.logger.log("Vote:", voteValue);
        }else{
            voteValue = 0;
        }

        console.log(`query snapshot exists: ${!querySnapshot.empty}`);
        console.log(`before Upvote: ${voteValue}`);

        switch(voteValue){
            case 1:
                screamData.nLikes = screamData.nLikes -2;
                likeData.value = -1;
                break;
            case 0:
                screamData.nLikes = screamData.nLikes -1;
                likeData.value = -1;
                break;
            case -1:
                return response.status(400).json({"message":"already downvoted"});
            default:
                return response.status(500).json({"message":"server has invalid vote value"});
        }

        if(querySnapshot.empty){
            return db.collection(`likes`).add(likeData)
            .then(() => {
                return downVoteScreamDocumentRef.update({nLikes:screamData.nLikes});
            })
            .then(()=>{
                return response.json(screamData);
            })
        }
        else{            
            db.collection("likes").doc(likeDocumentRefArray[0].id).update({value:likeData.value})
            .then(() => {
                return downVoteScreamDocumentRef.update({nLikes:screamData.nLikes});
            })
            .then(()=>{
                return response.json(screamData);
            })
            
        }
    })
    .catch((error) => {
        functions.logger.log("Error", error);
        return response.status(500).json({message:error.code});
    })
}

export const clearVote = (request:Request, response:Response) => {
    const likeQueryRef = db.collection(`likes`).where('screamId', '==', request.params.screamId).where('userHandle', '==', request.user.userHandle).limit(1);
    const clearScreamDocumentRef = db.doc(`screams/${request.params.screamId}`)
    
    let screamData;
    let likeData;
    let likeDocumentRefArray: any[] = []; 

    clearScreamDocumentRef.get()
    .then(function (documentSnapshot) {
        if(!documentSnapshot.exists){
            return response.status(404).json({"message":"scream not found"})
        }else{
            screamData = documentSnapshot.data();
            screamData.screamId = documentSnapshot.id;
            return likeQueryRef.get();
        }
    })
    .then((querySnapshot) => {

        let voteValue;

        if(!querySnapshot.empty){
            querySnapshot.forEach(function (doc) {
                likeDocumentRefArray.push(doc)
            });
            voteValue = likeDocumentRefArray[0].data().value;
            functions.logger.log("Vote:", voteValue);
        }else{
            voteValue = 0;
        }

        switch(voteValue){
            case 1:
                screamData.nLikes = screamData.nLikes -1;
                break;
            case 0:
                return response.status(400).json({"message":"already vote cleared"});
            case -1:
                screamData.nLikes = screamData.nLikes +1;
                break; 
            default:
                return response.status(500).json({"message":"server has invalid vote value"});
        }

        if(!querySnapshot.empty){
            db.collection("likes").doc(likeDocumentRefArray[0].id).delete()
            .then(() => {
                return clearScreamDocumentRef.update({nLikes:screamData.nLikes});
            })
            .then(()=>{
                return response.json(screamData);
            })
        }
    })
    .catch((error) => {
        return response.status(500).json({message:error.code});
    })
    
}

