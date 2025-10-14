export interface UserData {
    email: string;
    password: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    organisation?: string;
    avatarURL?:string;
    acceptTandC?:boolean;
    newsLetterSubs?:boolean;
}