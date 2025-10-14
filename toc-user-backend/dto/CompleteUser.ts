import {UserProfile} from './UserProfile';
import {User} from './User';

export interface CompleteUser extends User {
    profile?: UserProfile;
}