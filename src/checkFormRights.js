function checkFormRights (def, rights) {
  for (var k in def) {
    if (k === 'id') {
    }
    else if (!(k in rights.fields)) {
      delete def[k]
    }
    else if (rights.fields[k].type === 'sub_table') {
      checkFormRights(def[k].def.def, rights.fields[k])
    }
    else {
      def[k].may_read = ('read' in rights.fields[k] ? rights.fields[k].read : true)
      def[k].may_write = ('write' in rights.fields[k] ? rights.fields[k].write : false)

      if (rights.fields[k].write !== true) {
        def[k].type = 'label'
        def[k].include_data = false
      }
    }
  }
}

module.exports = checkFormRights
