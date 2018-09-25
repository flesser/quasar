import QIcon from '../icon/QIcon.js'
import { RouterLinkMixin } from '../../mixins/router-link.js'

import Vue from 'vue'
export default Vue.extend({
  name: 'QBreadcrumbsEl',

  mixins: [ RouterLinkMixin ],

  props: {
    label: String,
    icon: String,
    color: String
  },

  render (h) {
    return h(this.hasRouterLink ? 'router-link' : 'span', {
      staticClass: 'q-breadcrumbs__el q-link flex inline items-center relative-position',
      props: this.hasRouterLink ? this.routerLinkProps : null
    }, [

      (this.icon && h(QIcon, {
        staticClass: 'q-mr-sm',
        props: { name: this.icon }
      })) || void 0,

      this.label

    ].concat(this.$slots.default))
  }
})
