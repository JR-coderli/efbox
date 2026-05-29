const contentConfig = {
  pageName: 'domains',
  tableName: "import_list",
  header: {
    title: '重要域名',
    btnTitle: '新建域名'
  },
  propsList: [

    { type: 'index', label: '序号', width: '70', fixed: 'left' },


    { type: 'custom', label: '域名状态', prop01: 'is_accessible', prop02: 'is_safe', slotName: 'is_normal', width: '150' },

    { label: '域名', prop: 'existing_domain', width: '180' },
    { type: 'custom', label: '落地页地址', prop: 'landing_page_url', slotName: 'landing_page_url', width: '280' },
    { type: 'custom', label: '用途', prop: 'purpose', slotName: 'purpose', width: '150' },
    { type: 'custom', label: '备注', prop: 'remark', slotName: 'remark', width: '200' },


    { type: 'timer', label: '创建时间', prop: 'createAt', width: '180' },



    { type: 'handler', label: '操作', width: '150', fixed: 'right' },
  ]
}

export default contentConfig
