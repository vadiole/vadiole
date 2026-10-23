export function setupBeaverSound(locationButton) {
    let context;
    try {
        context = new AudioContext();
    } catch {
        return;
    }
    const gestures = ['pointerdown', 'keydown', 'click'];
    function unlock() {
        context.resume().then(() => {
            if (context.state === 'running') {
                gestures.forEach(type => document.removeEventListener(type, unlock));
            }
        }, () => {});
    }
    gestures.forEach(type => document.addEventListener(type, unlock));
    const beaver = locationButton.querySelector('.beaver');
    const clips = {
        bober: { file: 'bober.mp3' },
        hide: { file: 'hide.mp3' }
    };
    let active;
    let request = 0;

    function loadClip(clip) {
        if (!clip.loading) {
            clip.loading = fetch(`asset/sound/${clip.file}`).then(async response => {
                if (!response.ok) throw new Error(`Audio request failed: ${response.status}`);
                return context.decodeAudioData(await response.arrayBuffer());
            }).catch(error => {
                clip.loading = null;
                throw error;
            });
        }
        return clip.loading;
    }

    function stopSound() {
        request++;
        if (!active) return;
        const now = context.currentTime;
        active.gain.gain.cancelScheduledValues(now);
        active.gain.gain.setTargetAtTime(0, now, 0.003);
        active.source.stop(now + 0.015);
        active = null;
    }

    async function playMovement(clip, volume, state) {
        stopSound();
        const pending = request;
        const started = performance.now();
        const duration = parseFloat(getComputedStyle(beaver).transitionDuration) * 1000;
        try {
            const [buffer] = await Promise.all([
                loadClip(clip),
                state === 'peek' ? context.resume() : Promise.resolve()
            ]);
            if (pending !== request || (duration && performance.now() - started > duration)
                || context.state !== 'running' || document.hidden
                || beaver.dataset.state !== state) return;
            const source = context.createBufferSource();
            const gain = context.createGain();
            const now = context.currentTime;
            source.buffer = buffer;
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(volume, now + 0.005);
            gain.gain.setValueAtTime(volume, now + buffer.duration - 0.01);
            gain.gain.linearRampToValueAtTime(0, now + buffer.duration);
            source.connect(gain);
            gain.connect(context.destination);
            active = { source, gain };
            source.onended = () => {
                source.disconnect();
                gain.disconnect();
                if (active?.source === source) active = null;
            };
            source.start(now);
        } catch {}
    }

    locationButton.addEventListener('beaver:peek', () => playMovement(clips.bober, 0.06, 'peek'));
    locationButton.addEventListener('beaver:rise', event => {
        if (!event.detail.automatic) playMovement(clips.bober, 0.09, 'visible');
    });
    locationButton.addEventListener('beaver:hide', event => {
        if (event.detail.automatic) stopSound();
        else playMovement(clips.hide, 0.015, 'hidden');
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopSound();
    });
    Object.values(clips).forEach(clip => loadClip(clip).catch(() => {}));
}
