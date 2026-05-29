const contentConfig = {
  pageName: 'landingpage',
  isUpload: true,
  header: {
    title: '落地页列表',
    btnTitle: '新建落地页'
  },
  propsList: [

    { type: 'index', label: '序号', width: '70', fixed: 'left' },



    { label: '落地页名称', prop: 'landingname', width: '180' },

    { type: 'custom', label: '预览图', prop: 'preview_url', slotName: 'preview_url', width: '180' },

    
    { label: '落地页地址', prop: 'landing_url', width: '200' },
    { label: '落地页路径', prop: 'landing_path', width: '130' },
    { label: '版本', prop: 'version', width: '90' },


    { type: 'timer', label: '创建时间', prop: 'createAt', width: '180' },



    { type: 'handler', label: '操作', width: '160', fixed: 'right' },



  ]
}

export default contentConfig
