import { HERO_VARIANT } from "@/config/design";
import { HomeHeroBureau } from "./home-hero-bureau";
import { HomeHeroEditorial } from "./home-hero-editorial";

// Dispatches to the hero treatment selected in config/design.ts.
// Flip HERO_VARIANT there to switch between "editorial" and "bureau".
export function HomeHero() {
	return HERO_VARIANT === "editorial" ? <HomeHeroEditorial /> : <HomeHeroBureau />;
}
