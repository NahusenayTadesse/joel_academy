import type { Component } from 'svelte';
import Award from '@lucide/svelte/icons/award';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import CirclePlay from '@lucide/svelte/icons/circle-play';
import Clock from '@lucide/svelte/icons/clock';
import GraduationCap from '@lucide/svelte/icons/graduation-cap';
import Search from '@lucide/svelte/icons/search';
import ShieldCheck from '@lucide/svelte/icons/shield-check';
import Smartphone from '@lucide/svelte/icons/smartphone';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Star from '@lucide/svelte/icons/star';
import Target from '@lucide/svelte/icons/target';
import UserPlus from '@lucide/svelte/icons/user-plus';
import Users from '@lucide/svelte/icons/users';
import Zap from '@lucide/svelte/icons/zap';
import type { LandingIcon } from '$lib/content/landing';

/** The landing CMS's icon names, drawn. */
export const LANDING_ICON_COMPONENTS: Record<LandingIcon, Component> = {
	Clock,
	Users,
	Award,
	ShieldCheck,
	Smartphone,
	UserPlus,
	Search,
	CirclePlay,
	Sparkles,
	CircleCheck,
	Target,
	Zap,
	GraduationCap,
	Star
};

export const landingIcon = (name: string): Component =>
	LANDING_ICON_COMPONENTS[name as LandingIcon] ?? Sparkles;
