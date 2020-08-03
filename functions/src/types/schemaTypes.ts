export interface IScream{
    body: string,
    userHandle: string,
    createdAt: string,
    screamId: string,
    nLike?: 5,
    nDisike?: 2,
    nComment?: 7,
}

export interface IUserSignupInfo{
    email: string,
    password: string,
    confirmPassword: string,
    userHandle: string
}

export interface IUserLoginInfo{
    email:string,
    password:string
}

// redux data
export interface IUserData{
    credentials:{
        userId: string,
        email: string,
        userHandle: string,
        imageUrl: string,
        createdAt: string,
        bio?: string,
        website?: string,
        location?: string,
        gender?: string,
        age?: number,
    },
    likes:[
        {
            userHandle: string,
            screamId: string,
        }
    ]
}

export interface IUser{
    userId: string,
    email: string,
    userHandle: string,
    imageUrl: string,
    createdAt: string,
    bio?: string,
    website?: string,
    location?: string,
    gender?: string,
    age?: number,
}