class Selection {
  constructor () {
    this.list = []

    let menuTop = document.getElementById('menu-top')
    if (menuTop) {
      let li = document.createElement('li')

      let a = document.createElement('a')
      a.href = '#selected=1'
      a.appendChild(document.createTextNode('Auswahl: '))
      li.appendChild(a)

      this.domStatus = document.createElement('span')
      this.updateStatus()
      a.appendChild(this.domStatus)

      menuTop.appendChild(li)
    }

    register_hook('render-teaser', this.renderHook.bind(this))
    register_hook('render-show', this.renderHook.bind(this))
    register_hook('filter-formdef', formDef => {
      formDef.selected = {
        'type': 'select',
        'name': 'Auswahl',
        'values': {
          '1': 'nur ausgewählte'
        }
      }
    })
    register_hook('filter-to-param', (filter, param) => {
      if ('selected' in filter) {
        if (filter.selected === '1') {
          param.query.push([ 'id', 'in', this.list ])
        }

        delete filter.selected
      }
    })
    register_hook('url-receive', url => {
      if ('selection' in url) {
        this.list = url.selection.split(/,/)
        this.updateStatus()
        delete url.selection
      }
    })
    register_hook('url-build', url => {
      if (this.list.length) {
        url.selection = this.list.join(',')
      }
    })
  }

  updateStatus () {
    if (this.domStatus) {
      this.domStatus.innerHTML = this.list.length
    }
  }

  renderHook (div, data) {
    let menu = div.getElementsByClassName('menu')
    if (!menu.length) {
      return
    }

    let li = document.createElement('li')

    function updateEntryStatus (inSelection) {
      a.innerHTML = ''
      if (inSelection) {
        a.appendChild(document.createTextNode('Aus Auswahl entfernen'))
      } else {
        a.appendChild(document.createTextNode('Füge zu Auswahl hinzu'))
      }
    }

    let a = document.createElement('a')
    a.href = '#'
    updateEntryStatus(this.inList(data.id))
    a.onclick = () => {
      if (this.inList(data.id)) {
        this.del(data.id)
      } else {
        this.add(data.id)
      }
      update()
      this.updateStatus()
      updateEntryStatus(this.inList(data.id))
      return false
    }
    li.appendChild(a)

    menu[0].appendChild(li)
  }

  add (id) {
    this.list.push(id)
  }

  del (id) {
    let p = this.list.indexOf(id)

    if (p !== -1) {
      this.list.splice(p, 1)
    }
  }

  inList (id) {
    return this.list.indexOf(id) !== -1
  }

  getList () {
    return this.list
  }
}

module.exports = Selection
