const state = {
  currentMessageId: null,
  evidenceMap: {},
};

const listeners = [];

function notify() {
  listeners.forEach((listener) => listener({ ...state }));
}

const evidenceStore = {
  subscribe(listener) {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index >= 0) listeners.splice(index, 1);
    };
  },
  getState() {
    return { ...state };
  },
  setEvidence(messageId, evidence) {
    state.currentMessageId = messageId;
    state.evidenceMap[messageId] = evidence;
    notify();
  },
};

module.exports = {
  evidenceStore,
};
