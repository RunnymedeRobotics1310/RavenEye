import type {TrackScreenProps} from "~/routes/track/track-home-page.tsx";
import TrackNav from "~/common/track/TrackNav.tsx";
import {useState} from "react";

const PMVALoadShootSeqPage = ({}: TrackScreenProps) => {
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

    const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        // hopper filled --> stores pmva-hopper-full / pmva-hopper-not-full
        // loadNotes --> stores pmva-load-comments
        // pmva-unload-comments
    }
    return <main className="track pmva">
        <div>
            <TrackNav/>
            <h2>Post-Match Video Analysis - Pickup, Score & Shoot Sequence</h2>
            <p>Was the hopper filled?
                <button onClick={() => setHopperFilled(true)}
                        disabled={hopperFilled}>Yes</button>
                <button onClick={() => setHopperFilled(false)}
                        disabled={!(hopperFilled === undefined) && !hopperFilled}>No
                </button>
            </p>
            <p>
                Anything noteworthy about this load?
                <textarea onChange={(e) => setLoadNotes(e.target.value)}></textarea>
            </p>
            <p>Click on the buttons below to add to the count for this sequence. Play the video back slowly and get an
                accurate count for the sequence. The count is shown so that you can verify the amout if you're not sure
                what you saw.</p>
            <button onClick={() => setScoreCount(scoreCount + 1)}>Score One</button>
            ({scoreCount})
            <button onClick={() => setMissCount(missCount + 1)}>Miss One</button> ({missCount})
            ({Math.round(100 * scoreCount / Math.max(1, scoreCount + missCount))}%)
            <p>How long did it take to unload (rewind the video and play the sequence back. Use
                either the video time or a stopwatch)
                <input type="number" min={0} max={155}
                       onClick={(e) => setUnloadSeconds(Number((e.target as HTMLInputElement).value))}/> seconds.
            </p>
            <p>How much fuel was stuck after the end of the sequence?
                <input type="number" min={0} max={50}
                       onClick={(e) => setStuckFuelCount(Number((e.target as HTMLInputElement).value))}/> pieces.
            </p>
            <p>Anything noteworthy about this shooting session?
                <textarea onChange={(e) => setUnloadComments(e.target.value)}></textarea>
            </p>
            <p>Where was the robot while shooting? (select one)
                <button disabled={shootPosition === ShootPosition.close}
                        onClick={() => setShootPosition(ShootPosition.close)}>Close</button>
                <button disabled={shootPosition === ShootPosition.mid}
                        onClick={() => setShootPosition(ShootPosition.mid)}>Mid
                </button>
                <button disabled={shootPosition === ShootPosition.far}
                        onClick={() => setShootPosition(ShootPosition.far)}>Far
                </button>
            </p>
            <p>Was the robot moving while shooting?
                <button disabled={movingWhileShooting} onClick={() => setMovingWhileShooting(true)}>Moving</button>
                <button disabled={!(movingWhileShooting === undefined) && !movingWhileShooting} onClick={() => setMovingWhileShooting(false)}>Still</button>
            </p>
            <p>Was the robot shooting while intaking during this sequence?
                <button disabled={shootingWhileIntaking} onClick={() => setShootingWhileIntaking(true)}>Yes</button>
                <button disabled={!(shootingWhileIntaking === undefined) && !shootingWhileIntaking} onClick={() => setShootingWhileIntaking(false)}>No</button>
            </p>
            <button disabled={isIncomplete()} onClick={e => handleSubmit(e)}>Save Sequence</button>
        </div>
    </main>

}

export default PMVALoadShootSeqPage;