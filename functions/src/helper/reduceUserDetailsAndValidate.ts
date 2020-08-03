export const reduceUserdetails = (data: any) => {
    let userDetails: any = {};

    if (data.bio && data.bio.trim() !== "") {
        userDetails.bio = data.bio;
    }
    if (data.location && data.location.trim() !== "") {
        userDetails.location = data.location;
    }
    if (data.gender && data.gender.trim() !== "") {
        userDetails.gender = data.gender;
    }
    if (data.age && data.age >= 0 && data.age <= 120 && Number.isInteger(parseInt(data.age))) {
        userDetails.age = data.age;
    }
    if (data.website && data.website.trim() !== "") {
        if (data.website.trim().substring(0, 4) !== 'http') {
            userDetails.website = `http://${data.website.trim()}`;
        } else {
            userDetails.website = data.website.trim();
        }
    }
    return userDetails;
}