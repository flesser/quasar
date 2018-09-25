import QSpinner from '../spinner/QSpinner.js'

import Vue from 'vue'
export default Vue.extend({
  name: 'QInnerLoading',

  props: {
    dark: Boolean,
    visible: Boolean,
    size: {
      type: [String, Number],
      default: 42
    },
    color: String
  },

  render (h) {
    if (!this.visible) { return }

    return h(
      'div',
      {
        staticClass: 'q-inner-loading animate-fade absolute-full column flex-center',
        'class': { 'q-inner-loading--dark': this.dark }
      },
      this.$slots.default || [
        h(QSpinner, {
          props: {
            size: this.size,
            color: this.color
          }
        })
      ]
    )
  }
})
