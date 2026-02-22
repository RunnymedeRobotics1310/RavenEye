import type {ComponentType} from "react";
import type {TrackScreenProps} from "~/routes/track/track-home-page.tsx";
import Home from "~/common/track/Home.tsx";
import QuickCommentForm from "~/common/track/QuickCommentForm.tsx";
import DrillSetup from "~/common/track/DrillSetup.tsx";
import AreaStart from "~/common/track/AreaStart.tsx";
import PitScoutPage from "~/common/track/PitScoutPage.tsx";
import CompStart from "~/common/track/CompStart.tsx";
import CompLevel from "~/common/track/CompLevel.tsx";
import MatchForm from "~/common/track/MatchForm.tsx";
import CompTeams from "~/common/track/CompTeams.tsx";
import SequencePage from "~/common/track/seq/SequencePage.tsx";
import AreaPage from "~/common/track/strat-area/AreaPage.tsx";

/**
 * Maps navigation strings to custom components. This is effectively
 * a custom router that ensures that all components remain loaded,
 * without requiring an internet connection.
 */
const trackPageRegistry: Record<string, ComponentType<TrackScreenProps>> = {

    // setup screens
    "home": Home,
    // quick comment
    "comment": QuickCommentForm,
    // drill
    "drill-setup": DrillSetup,
    // competition
    "comp-tournament": CompStart,
    "comp-level": CompLevel,
    "comp-match": MatchForm,
    "comp-teams": CompTeams,

    // strategy area pages
    "area-menu": AreaStart,
    "area:default": AreaPage,
    // custom strat area pages
    "area:pit": PitScoutPage,


    // sequence pages
    "seq:default": SequencePage,
    // custom sequence pages
    // "seq:auto": AutoPage,
    // "seq:defense": DefensePage,
    // "seq:endgame": EndgamePage,
    // "seq:pickup": PickupPage,
    // "seq:scoring": ScorePage,

};

export default trackPageRegistry;
