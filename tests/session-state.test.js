// session-state.test.js

const { Session } = require('../../src/session'); // Adjust path as needed

describe('Session State Management', () => {
  beforeEach(() => {
    // Mock local state if needed
    Session.current = null;
  });

  it('should start with no session active', () => {
    expect(Session.state.paused).toBe(true);
    expect(Session.state.queueIdx).toBe(0);
  });

  it('should track elapsed time correctly', async () => {
    Session.startSession({ exercises: [{ name: 'test' }] });
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(Session.state.elapsedSoFar).toBeGreaterThan(0);
  });

  it('should handle pause/resume', () => {
    Session.startSession();
    Session.togglePause();
    expect(Session.state.paused).toBe(true);
    Session.togglePause();
    expect(Session.state.paused).toBe(false);
  });
});