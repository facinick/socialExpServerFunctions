import * as functions from 'firebase-functions';
import * as express from "express";
import { initializeApp } from 'firebase';
import { firebaseConfig } from "./configs/firebaseConfig";
import { getAllScreams, postOneScream, getScream, addComment, upVote, downVote ,clearVote, deleteScream } from "./handlers/screams";
import { signIn, signUp, uploadImage, addUserDetails, getAuthenticatedUserDetails } from "./handlers/users";
import { FBAuth } from "./util/fbAuth";

initializeApp(firebaseConfig);
const app = express();

// screams
app.get('/screams', getAllScreams);
app.post('/scream', FBAuth, postOneScream);
app.get('/scream/:screamId', getScream);
app.delete('/scream/:screamId', FBAuth, deleteScream);
app.post('/scream/:screamId/comment', FBAuth, addComment);
// app.delete('/comment/:commentId', FBAuth, deleteScream);

app.post('/scream/:screamId/vote/up', FBAuth, upVote);
app.post('/scream/:screamId/vote/down', FBAuth, downVote);
app.post('/scream/:screamId/vote/clear', FBAuth, clearVote);
// anonymous voting; future feature lelly
// app.post('/scream/:screamId/like/clear', thumbsUp);

// users;
app.post('/signup', signUp);
app.post('/login', signIn);
app.post('/user/profileImage', FBAuth, uploadImage);
app.post('/user/details', FBAuth, addUserDetails);
app.get('/user/details', FBAuth, getAuthenticatedUserDetails);

export const api = functions.https.onRequest(app);