import QIcon from '../icon/QIcon.js'
import QCheckbox from '../checkbox/QCheckbox.js'
import QSlideTransition from '../slide-transition/QSlideTransition.js'
import QSpinner from '../spinner/QSpinner.js'
import { stopAndPrevent } from '../../utils/event.js'

import Vue from 'vue'
export default Vue.extend({
  name: 'QTree',

  props: {
    nodes: Array,
    nodeKey: {
      type: String,
      required: true
    },
    labelKey: {
      type: String,
      default: 'label'
    },

    color: String,
    controlColor: String,
    textColor: String,
    selectedColor: String,
    dark: Boolean,

    icon: String,

    tickStrategy: {
      type: String,
      default: 'none',
      validator: v => ['none', 'strict', 'leaf', 'leaf-filtered'].includes(v)
    },
    ticked: Array, // sync
    expanded: Array, // sync
    selected: {}, // sync

    defaultExpandAll: Boolean,
    accordion: Boolean,

    filter: String,
    filterMethod: {
      type: Function,
      default (node, filter) {
        const filt = filter.toLowerCase()
        return node[this.labelKey] &&
          node[this.labelKey].toLowerCase().indexOf(filt) > -1
      }
    },

    duration: Number,

    noNodesLabel: String,
    noResultsLabel: String
  },

  computed: {
    classes () {
      return {
        [`text-${this.color}`]: this.color,
        'q-tree--dark': this.dark
      }
    },

    hasSelection () {
      return this.selected !== void 0
    },

    computedIcon () {
      return this.icon || this.$q.icon.tree.icon
    },

    computedControlColor () {
      return this.controlColor || this.color
    },

    textColorClass () {
      if (this.textColor) {
        return `text-${this.textColor}`
      }
    },

    selectedColorClass () {
      const color = this.selectedColor || this.color
      if (color) {
        return `text-${color}`
      }
    },

    meta () {
      const meta = {}

      const travel = (node, parent) => {
        const tickStrategy = node.tickStrategy || (parent ? parent.tickStrategy : this.tickStrategy)
        const
          key = node[this.nodeKey],
          isParent = node.children && node.children.length > 0,
          isLeaf = !isParent,
          selectable = !node.disabled && this.hasSelection && node.selectable !== false,
          expandable = !node.disabled && node.expandable !== false,
          hasTicking = tickStrategy !== 'none',
          strictTicking = tickStrategy === 'strict',
          leafFilteredTicking = tickStrategy === 'leaf-filtered',
          leafTicking = tickStrategy === 'leaf' || tickStrategy === 'leaf-filtered'

        let tickable = !node.disabled && node.tickable !== false
        if (leafTicking && tickable && parent && !parent.tickable) {
          tickable = false
        }

        let lazy = node.lazy
        if (lazy && this.lazy[key]) {
          lazy = this.lazy[key]
        }

        const m = {
          key,
          parent,
          isParent,
          isLeaf,
          lazy,
          disabled: node.disabled,
          link: !node.disabled && (selectable || (expandable && (isParent || lazy === true))),
          children: [],
          matchesFilter: this.filter ? this.filterMethod(node, this.filter) : true,

          selected: key === this.selected && selectable,
          selectable,
          expanded: isParent ? this.innerExpanded.includes(key) : false,
          expandable,
          noTick: node.noTick || (!strictTicking && lazy && lazy !== 'loaded'),
          tickable,
          tickStrategy,
          hasTicking,
          strictTicking,
          leafFilteredTicking,
          leafTicking,
          ticked: strictTicking
            ? this.innerTicked.includes(key)
            : (isLeaf ? this.innerTicked.includes(key) : false)
        }

        meta[key] = m

        if (isParent) {
          m.children = node.children.map(n => travel(n, m))

          if (this.filter) {
            if (!m.matchesFilter) {
              m.matchesFilter = m.children.some(n => n.matchesFilter)
            }
            if (
              m.matchesFilter &&
              !m.noTick &&
              !m.disabled &&
              m.tickable &&
              leafFilteredTicking &&
              m.children.every(n => !n.matchesFilter || n.noTick || !n.tickable)
            ) {
              m.tickable = false
            }
          }

          if (m.matchesFilter) {
            if (!m.noTick && !strictTicking && m.children.every(n => n.noTick)) {
              m.noTick = true
            }

            if (leafTicking) {
              m.ticked = false
              m.indeterminate = m.children.some(node => node.indeterminate)

              if (!m.indeterminate) {
                const sel = m.children
                  .reduce((acc, meta) => meta.ticked ? acc + 1 : acc, 0)

                if (sel === m.children.length) {
                  m.ticked = true
                }
                else if (sel > 0) {
                  m.indeterminate = true
                }
              }
            }
          }
        }

        return m
      }

      this.nodes.forEach(node => travel(node, null))
      return meta
    }
  },

  data () {
    return {
      lazy: {},
      innerTicked: this.ticked || [],
      innerExpanded: this.expanded || []
    }
  },

  watch: {
    ticked (val) {
      this.innerTicked = val
    },

    expanded (val) {
      this.innerExpanded = val
    }
  },

  methods: {
    getNodeByKey (key) {
      const reduce = [].reduce

      const find = (result, node) => {
        if (result || !node) {
          return result
        }
        if (Array.isArray(node)) {
          return reduce.call(Object(node), find, result)
        }
        if (node[this.nodeKey] === key) {
          return node
        }
        if (node.children) {
          return find(null, node.children)
        }
      }

      return find(null, this.nodes)
    },

    getTickedNodes () {
      return this.innerTicked.map(key => this.getNodeByKey(key))
    },

    getExpandedNodes () {
      return this.innerExpanded.map(key => this.getNodeByKey(key))
    },

    isExpanded (key) {
      return key && this.meta[key]
        ? this.meta[key].expanded
        : false
    },

    collapseAll () {
      if (this.expanded !== void 0) {
        this.$emit('update:expanded', [])
      }
      else {
        this.innerExpanded = []
      }
    },

    expandAll () {
      const
        expanded = this.innerExpanded,
        travel = node => {
          if (node.children && node.children.length > 0) {
            if (node.expandable !== false && node.disabled !== true) {
              expanded.push(node[this.nodeKey])
              node.children.forEach(travel)
            }
          }
        }

      this.nodes.forEach(travel)

      if (this.expanded !== void 0) {
        this.$emit('update:expanded', expanded)
      }
      else {
        this.innerExpanded = expanded
      }
    },

    setExpanded (key, state, node = this.getNodeByKey(key), meta = this.meta[key]) {
      if (meta.lazy && meta.lazy !== 'loaded') {
        if (meta.lazy === 'loading') {
          return
        }

        this.$set(this.lazy, key, 'loading')
        this.$emit('lazy-load', {
          node,
          key,
          done: children => {
            this.lazy[key] = 'loaded'
            if (children) {
              node.children = children
            }
            this.$nextTick(() => {
              const m = this.meta[key]
              if (m && m.isParent) {
                this.__setExpanded(key, true)
              }
            })
          },
          fail: () => {
            this.$delete(this.lazy, key)
          }
        })
      }
      else if (meta.isParent && meta.expandable) {
        this.__setExpanded(key, state)
      }
    },

    __setExpanded (key, state) {
      let target = this.innerExpanded
      const emit = this.expanded !== void 0

      if (emit) {
        target = target.slice()
      }

      if (state) {
        if (this.accordion) {
          if (this.meta[key]) {
            const collapse = []
            if (this.meta[key].parent) {
              this.meta[key].parent.children.forEach(m => {
                if (m.key !== key && m.expandable) {
                  collapse.push(m.key)
                }
              })
            }
            else {
              this.nodes.forEach(node => {
                const k = node[this.nodeKey]
                if (k !== key) {
                  collapse.push(k)
                }
              })
            }
            if (collapse.length > 0) {
              target = target.filter(k => !collapse.includes(k))
            }
          }
        }

        target = target.concat([ key ])
          .filter((key, index, self) => self.indexOf(key) === index)
      }
      else {
        target = target.filter(k => k !== key)
      }

      if (emit) {
        this.$emit(`update:expanded`, target)
      }
      else {
        this.innerExpanded = target
      }
    },

    isTicked (key) {
      return key && this.meta[key]
        ? this.meta[key].ticked
        : false
    },

    setTicked (keys, state) {
      let target = this.innerTicked
      const emit = this.ticked !== void 0

      if (emit) {
        target = target.slice()
      }

      if (state) {
        target = target.concat(keys)
          .filter((key, index, self) => self.indexOf(key) === index)
      }
      else {
        target = target.filter(k => !keys.includes(k))
      }

      if (emit) {
        this.$emit(`update:ticked`, target)
      }
    },

    __getSlotScope (node, meta, key) {
      const scope = { tree: this, node, key, color: this.color, dark: this.dark }

      Object.defineProperty(scope, 'expanded', {
        get: () => { return meta.expanded },
        set: val => { val !== meta.expanded && this.setExpanded(key, val) }
      })
      Object.defineProperty(scope, 'ticked', {
        get: () => { return meta.ticked },
        set: val => { val !== meta.ticked && this.setTicked([ key ], val) }
      })

      return scope
    },

    __getChildren (h, nodes) {
      return (
        this.filter
          ? nodes.filter(n => this.meta[n[this.nodeKey]].matchesFilter)
          : nodes
      ).map(child => this.__getNode(h, child))
    },

    __getNodeMedia (h, node) {
      if (node.icon) {
        return h(QIcon, {
          staticClass: `q-tree__icon q-mr-sm`,
          props: { name: node.icon, color: node.iconColor }
        })
      }
      const src = node.img || node.avatar
      if (src) {
        return h('img', {
          staticClass: `q-tree__${node.img ? 'img' : 'avatar'} q-mr-sm`,
          attrs: { src }
        })
      }
    },

    __getNode (h, node) {
      const
        key = node[this.nodeKey],
        meta = this.meta[key],
        header = node.header
          ? this.$scopedSlots[`header-${node.header}`] || this.$scopedSlots['default-header']
          : this.$scopedSlots['default-header']

      const children = meta.isParent
        ? this.__getChildren(h, node.children)
        : []

      const isParent = children.length > 0 || (meta.lazy && meta.lazy !== 'loaded')

      let
        body = node.body
          ? this.$scopedSlots[`body-${node.body}`] || this.$scopedSlots['default-body']
          : this.$scopedSlots['default-body'],
        slotScope = header || body
          ? this.__getSlotScope(node, meta, key)
          : null

      if (body) {
        body = h('div', { staticClass: 'q-tree__node-body relative-position' }, [
          h('div', { 'class': this.textColorClass }, [
            body(slotScope)
          ])
        ])
      }

      return h('div', {
        key,
        staticClass: 'q-tree__node relative-position',
        'class': { 'q-tree__node--parent': isParent, 'q-tree__node--child': !isParent }
      }, [
        h('div', {
          staticClass: 'q-tree__node-header relative-position row no-wrap items-center',
          'class': {
            'q-tree__node--link q-hoverable q-focusable': meta.link,
            'q-tree__node--selected': meta.selected,
            disabled: meta.disabled
          },
          attrs: { tabindex: meta.link ? 0 : -1 },
          on: {
            click: () => {
              this.__onClick(node, meta)
            },
            keydown: e => {
              if (e.keyCode === 13) { this.__onClick(node, meta) }
              else if (e.keyCode === 32) { this.__onExpandClick(node, meta, e) }
            }
          }
        }, [
          h('div', { staticClass: 'q-focus-helper' }),

          meta.lazy === 'loading'
            ? h(QSpinner, {
              staticClass: 'q-tree__spinner q-mr-xs',
              props: { color: this.computedControlColor }
            })
            : (
              isParent
                ? h(QIcon, {
                  staticClass: 'q-tree__arrow q-mr-xs generic-transition',
                  'class': { 'q-tree__arrow--rotate': meta.expanded },
                  props: { name: this.computedIcon },
                  nativeOn: {
                    click: e => {
                      this.__onExpandClick(node, meta, e)
                    }
                  }
                })
                : null
            ),

          meta.hasTicking && !meta.noTick
            ? h(QCheckbox, {
              staticClass: 'q-mr-xs',
              props: {
                value: meta.indeterminate ? null : meta.ticked,
                color: this.computedControlColor,
                dark: this.dark,
                keepColor: true,
                disable: !meta.tickable
              },
              on: {
                keydown: stopAndPrevent,
                input: v => {
                  this.__onTickedClick(node, meta, v)
                }
              }
            })
            : null,

          h('div', {
            'staticClass': 'q-tree__node-header-content col row no-wrap items-center',
            'class': meta.selected ? this.selectedColorClass : this.textColorClass
          }, [
            header
              ? header(slotScope)
              : [
                this.__getNodeMedia(h, node),
                h('div', node[this.labelKey])
              ]
          ])
        ]),

        isParent
          ? h(QSlideTransition, {
            props: { duration: this.duration }
          }, [
            h('div', {
              staticClass: 'q-tree__node-collapsible',
              'class': this.textColorClass,
              directives: [{ name: 'show', value: meta.expanded }]
            }, [
              body,

              h('div', {
                staticClass: 'q-tree__children',
                'class': { disabled: meta.disabled }
              }, children)
            ])
          ])
          : body
      ])
    },

    __blur () {
      document.activeElement && document.activeElement.blur()
    },

    __onClick (node, meta) {
      this.__blur()

      if (this.hasSelection) {
        if (meta.selectable) {
          this.$emit('update:selected', meta.key !== this.selected ? meta.key : null)
        }
      }
      else {
        this.__onExpandClick(node, meta)
      }

      if (typeof node.handler === 'function') {
        node.handler(node)
      }
    },

    __onExpandClick (node, meta, e) {
      if (e !== void 0) {
        stopAndPrevent(e)
      }
      this.__blur()
      this.setExpanded(meta.key, !meta.expanded, node, meta)
    },

    __onTickedClick (node, meta, state) {
      if (meta.indeterminate && state) {
        state = false
      }
      if (meta.strictTicking) {
        this.setTicked([ meta.key ], state)
      }
      else if (meta.leafTicking) {
        const keys = []
        const travel = meta => {
          if (meta.isParent) {
            if (!state && !meta.noTick && meta.tickable) {
              keys.push(meta.key)
            }
            if (meta.leafTicking) {
              meta.children.forEach(travel)
            }
          }
          else if (!meta.noTick && meta.tickable && (!meta.leafFilteredTicking || meta.matchesFilter)) {
            keys.push(meta.key)
          }
        }
        travel(meta)
        this.setTicked(keys, state)
      }
    }
  },

  render (h) {
    const children = this.__getChildren(h, this.nodes)

    return h(
      'div', {
        staticClass: 'q-tree relative-position',
        'class': this.classes
      },
      children.length === 0
        ? (
          this.filter
            ? this.noResultsLabel || this.$q.i18n.tree.noResults
            : this.noNodesLabel || this.$q.i18n.tree.noNodes
        )
        : children
    )
  },

  created () {
    if (this.defaultExpandAll) {
      this.expandAll()
    }
  }
})
