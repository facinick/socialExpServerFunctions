export const isValidEmail = (email:string) => {
    const re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email.trim());
}

export const isValidPassword = (password: string, confirmPassword: string) => {
    return ( confirmPassword.trim() === password.trim() && password.trim() !== "");
}

export const isEmpty = (input: string) => {
    return ( input.trim() === "");
}

export const isNotEmpty = (input: string) => {
    return ( input.trim() !== "");
}

export const isValidHandle = (handle:string) => {
    return (handle.trim() !== "");
}