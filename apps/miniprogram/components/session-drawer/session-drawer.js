Component({
  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
    groups: {
      type: Array,
      value: [],
    },
    currentSessionId: {
      type: Number,
      value: null,
    },
  },
  methods: {
    close() {
      this.triggerEvent('close');
    },
    newSession() {
      this.triggerEvent('newsession');
    },
    selectSession(event) {
      this.triggerEvent('select', { sessionId: Number(event.currentTarget.dataset.sessionId) });
    },
    renameSession(event) {
      this.triggerEvent('rename', {
        sessionId: Number(event.currentTarget.dataset.sessionId),
        title: event.currentTarget.dataset.title,
      });
    },
    deleteSession(event) {
      this.triggerEvent('delete', { sessionId: Number(event.currentTarget.dataset.sessionId) });
    },
  },
});
