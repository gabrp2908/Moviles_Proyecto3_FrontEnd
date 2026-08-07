export interface AuthUser { userId: string; email: string; }
export interface AuthTokenResponse { user: AuthUser; access_token: string; token_type: 'Bearer'; expires_in: number; }
export type Gender = 'masculino' | 'femenino' | 'otro';
export type Education = 'Bachelors' | 'In College' | 'High School' | 'PhD' | 'In Grad School' | 'Masters';
export interface Profile { id: string; userId: string; name: string; birthDate: string; age: number; aboutMe: string | null; height: number | null; gender: Gender | null; country: string | null; education: Education | null; languages: string[]; photos: string[]; }
export type FeedProfile = Profile;
export interface CreateProfilePayload { name: string; birthDate: string; aboutMe?: string; height?: number; gender?: Gender; country?: string; education?: Education; languages?: string[]; photos: string[]; }
export type UpdateProfilePayload = Partial<CreateProfilePayload>;
export interface Preference { id?: string; userId: string; ageMin: number; ageMax: number; genders: Gender[]; countries: string[]; }
export type UpdatePreferencePayload = Partial<Omit<Preference, 'id' | 'userId'>>;
export interface SwipePayload { toUserId: string; direction: 'left' | 'right'; }
export interface SwipeResponse { matched: boolean; matchId?: string; chatId?: string; }
export interface Match { id: string; userIds: string[]; createdAt: string; }
export interface IncomingLike extends FeedProfile { likedAt: string; }
export interface ChatListItem { id: string; matchId: string; participants: string[]; lastMessage: { content: string; senderId: string; type: 'text' | 'image'; createdAt: string; } | null; unreadCount: number; createdAt: string; updatedAt: string; }
export interface Message { id: string; chatId: string; senderId: string; content: string; type: 'text' | 'image'; imageUrl: string | null; read: boolean; createdAt: string; }
export interface MessagesResponse { messages: Message[]; total: number; page: number; totalPages: number; }
