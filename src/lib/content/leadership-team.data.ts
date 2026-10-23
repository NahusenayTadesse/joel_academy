import { m } from '$lib/paraglide/messages';

export interface LeaderProfile {
	name: string;
	role: string;
	bio: string;
	avatarColor: string;
}

/** Role and bio are read through getters, so they come out in the current request's language. */
function leader(name: string, role: () => string, bio: () => string, avatarColor: string): LeaderProfile {
	return {
		name,
		get role() {
			return role();
		},
		get bio() {
			return bio();
		},
		avatarColor
	};
}

/** Demo content only - illustrative leadership profiles for the About page. */
export const LEADERSHIP_TEAM: LeaderProfile[] = [
	leader('Joel Talargie', m.info_leader_joel_role, m.info_leader_joel_bio, 'from-blue-500 to-indigo-600'),
	leader('Hannah Okoye', m.info_leader_hannah_role, m.info_leader_hannah_bio, 'from-emerald-500 to-teal-600'),
	leader('Ravi Patel', m.info_leader_ravi_role, m.info_leader_ravi_bio, 'from-violet-500 to-purple-600'),
	leader('Maria Santos', m.info_leader_maria_role, m.info_leader_maria_bio, 'from-rose-500 to-pink-600')
];
