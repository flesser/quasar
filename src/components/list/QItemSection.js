import Vue from 'vue'
export default Vue.extend({
  name: 'QItemSection',

  props: {
    avatar: Boolean,
    thumbnail: Boolean,
    side: Boolean,
    top: Boolean
  },

  computed: {
    classes () {
      const side = this.avatar || this.side || this.thumbnail

      return {
        'q-item__section--top': this.top,
        'q-item__section--avatar': this.avatar,
        'q-item__section--thumbnail': this.thumbnail,
        'q-item__section--side': side,
        'q-item__section--main col': !side,
        [`justify-${this.top ? 'start' : 'center'}`]: true
      }
    }
  },

  render (h) {
    return h('div', {
      staticClass: 'q-item__section column text-subtitle1',
      'class': this.classes
    }, this.$slots.default)
  }
})
