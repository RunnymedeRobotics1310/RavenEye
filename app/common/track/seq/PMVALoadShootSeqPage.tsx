import type {TrackScreenProps} from "~/routes/track/track-home-page.tsx";
import TrackNav from "~/common/track/TrackNav.tsx";
import {useState} from "react";
import {recordEvent} from "~/common/storage/track.ts";
import {useTrackNav} from "~/common/track/TrackNavContext.tsx";

const PMVALoadShootSeqPage = ({}: TrackScreenProps) => {
    const {goBack} = useTrackNav();
    const [hopperFilled, setHopperFilled] = useState<boolean | undefined>(undefined);
    const [loadNotes, setLoadNotes] = useState<string | undefined>(undefined);
    const [scoreCount, setScoreCount] = useState<number>(0);
    const [missCount, setMissCount] = useState<number>(0);
    const [unloadSeconds, setUnloadSeconds] = useState<number>(-1);
    const [stuckFuelCount, setStuckFuelCount] = useState<number>(-1);
    const [unloadComments, setUnloadComments] = useState<string | undefined>(undefined);

    enum ShootPosition { close, mid, far };
    const [shootPosition, setShootPosition] = useState<ShootPosition | undefined>(undefined);
    const [movingWhileShooting, setMovingWhileShooting] = useState<boolean | undefined>(undefined);
    const [shootingWhileIntaking, setShootingWhileIntaking] = useState<boolean | undefined>(undefined);

    const isIncomplete: () => boolean = () => {
        if (hopperFilled === undefined) return true;
        if (unloadSeconds === -1) return true;
        if (stuckFuelCount === -1) return true;
        if (shootPosition === undefined) return true;
        if (movingWhileShooting === undefined) return true;
        if (shootingWhileIntaking === undefined) return true;
        return false
    }

    const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (hopperFilled) {
            await recordEvent('pmva-load-hopper-full')
        } else {
            await recordEvent('pmva-load-hopper-not-full')
        }
        if (loadNotes) {
            await recordEvent('pmva-load-comments', -1, loadNotes)
        }
        await recordEvent('pmva-load', scoreCount + missCount + stuckFuelCount)
        await recordEvent("pmva-shoot", scoreCount + missCount)
        await recordEvent("pmva-shoot-score", scoreCount);
        await recordEvent("pmva-shoot-miss", missCount);
        await recordEvent("pmva-shoot-time", unloadSeconds);
        await recordEvent("pmva-shoot-stuck-in-hopper", stuckFuelCount);
        if (unloadComments) {
            await recordEvent("pmva-shoot-note", -1, unloadComments)
        }
        if (shootPosition === ShootPosition.close) {
            await recordEvent("pmva-shoot-close")
        } else if (shootPosition === ShootPosition.mid) {
            await recordEvent("pmva-shoot-mid")
        } else if (shootPosition === ShootPosition.far) {
            await recordEvent("pmva-shoot-far")
        }
        if (movingWhileShooting) {
            await recordEvent("pmva-shoot-moving");
        }
        if (shootingWhileIntaking) {
            await recordEvent("pmva-shoot-intaking");
        }
        await recordEvent("pmva-shoot-end");
        goBack();
    }

    return <main className="track pmva">
        <div>
            <TrackNav/>
            <h2>Post-Match Video Analysis — Pickup, Score & Shoot Sequence</h2>

            <div className="pmva-form">
                <div className="pmva-form-row">
                    <label>Was the hopper filled?<span className="pmva-required">*</span></label>
                    <div className="pmva-btn-group">
                        <button onClick={() => setHopperFilled(true)}
                                disabled={hopperFilled}>Yes
                        </button>
                        <button onClick={() => setHopperFilled(false)}
                                disabled={!(hopperFilled === undefined) && !hopperFilled}>No
                        </button>
                    </div>
                </div>

                <div className="pmva-form-row">
                    <label>Anything noteworthy about this load?</label>
                    <textarea onChange={(e) => setLoadNotes(e.target.value)}/>
                </div>

                <div className="pmva-form-row">
                    <label>Score / Miss count</label>
                    <p className="pmva-hint">
                        Play the video back slowly and get an accurate count for the sequence.
                    </p>
                    <div className="pmva-counter-row">
                        <button onClick={() => setScoreCount(scoreCount + 1)}>Score One</button>
                        <span className="pmva-counter-value">{scoreCount}</span>
                        <button onClick={() => setMissCount(missCount + 1)}>Miss One</button>
                        <span className="pmva-counter-value">{missCount}</span>
                        <span className="pmva-counter-pct">
                            {Math.round(100 * scoreCount / Math.max(1, scoreCount + missCount))}%
                        </span>
                    </div>
                </div>

                <div className="pmva-form-row">
                    <label>How long did it take to unload? (seconds)<span className="pmva-required">*</span></label>
                    <p className="pmva-hint">
                        Rewind the video and play the sequence back. Use either the video time or a stopwatch.
                    </p>
                    <input type="number" min={0} max={155}
                           onChange={(e) => setUnloadSeconds(Number(e.target.value))}/>
                </div>

                <div className="pmva-form-row">
                    <label>How much fuel was stuck after the sequence?<span className="pmva-required">*</span></label>
                    <input type="number" min={0} max={50}
                           onChange={(e) => setStuckFuelCount(Number(e.target.value))}/>
                </div>

                <div className="pmva-form-row">
                    <label>Anything noteworthy about this shooting session?</label>
                    <textarea onChange={(e) => setUnloadComments(e.target.value)}/>
                </div>

                <div className="pmva-form-row">
                    <label>Where was the robot while shooting?<span className="pmva-required">*</span></label>
                    <div className="pmva-btn-group">
                        <button disabled={shootPosition === ShootPosition.close}
                                onClick={() => setShootPosition(ShootPosition.close)}>Close
                        </button>
                        <button disabled={shootPosition === ShootPosition.mid}
                                onClick={() => setShootPosition(ShootPosition.mid)}>Mid
                        </button>
                        <button disabled={shootPosition === ShootPosition.far}
                                onClick={() => setShootPosition(ShootPosition.far)}>Far
                        </button>
                    </div>
                </div>

                <div className="pmva-form-row">
                    <label>Was the robot moving while shooting?<span className="pmva-required">*</span></label>
                    <div className="pmva-btn-group">
                        <button disabled={movingWhileShooting}
                                onClick={() => setMovingWhileShooting(true)}>Moving
                        </button>
                        <button disabled={!(movingWhileShooting === undefined) && !movingWhileShooting}
                                onClick={() => setMovingWhileShooting(false)}>Still
                        </button>
                    </div>
                </div>

                <div className="pmva-form-row">
                    <label>Was the robot shooting while intaking during this sequence?<span
                        className="pmva-required">*</span></label>
                    <div className="pmva-btn-group">
                        <button disabled={shootingWhileIntaking}
                                onClick={() => setShootingWhileIntaking(true)}>Yes
                        </button>
                        <button disabled={!(shootingWhileIntaking === undefined) && !shootingWhileIntaking}
                                onClick={() => setShootingWhileIntaking(false)}>No
                        </button>
                    </div>
                </div>

                <div className="pmva-form-actions">
                    <button disabled={isIncomplete()} onClick={e => handleSubmit(e)}>Save Sequence</button>
                </div>
            </div>
        </div>
    </main>
}

export default PMVALoadShootSeqPage;
