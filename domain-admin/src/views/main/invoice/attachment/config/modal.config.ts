const modalConfig = {
  pageName: 'cus_attachments',

  labelWidth: '80px', // 弹窗中的输入框左边的文字宽度
  header: {
    newTitle: '创建发票',
    editTitle: '编辑发票',
  },
  formItems: [
    {
      type: 'custom',
      slotName: 'customer',
      label: '客户',
      prop: "customer"
    },
    {
      type: 'custom',
      slotName: 'invoice_entity',
      label: '开票主体',
      prop: "invoice_entity"
    },
    {
      type: 'table',
      label: '表格',
      prop: 'table',
      placeholder: '请输入描述',
      initialValue: [
        { desc: '', period: [], amount: 0 }
      ]
    },
























   


















  ]
}

export default modalConfig
