const contentConfig = {
  pageName: 'cus_attachments',
  border: false, // 表格是否显示边框


  header: {
    title: '发票列表',
    btnTitle: '创建发票'
  },
  propsList: [

    {
      type: 'custom',
      slotName: 'reverse_index',
      label: '序号',
      prop: 'reverse_index',
      width: '60'
    },

    {
      label: 'ID',
      prop: 'id',
      width: '60',
      defaultHidden: true
    },

    {
      type: 'custom-header',
      slotName: 'customer_short_name',
      label: '客户简称',
      prop: 'customer.short_name',
      width: '100'
    },

    {
      type: 'custom',
      slotName: 'invoice_entity',
      label: '开票主体',
      prop: 'invoice_entity_name',
      width: '150',
      showOverflowTooltip: true
    },

    {
      type: 'custom',
      slotName: 'amount',
      label: '金额',
      prop: 'amount',
      width: '100',
      sortable: 'custom'
    },

    {
      type: 'custom',
      slotName: 'period',
      label: '周期',
      prop: 'period',
      width: '180',
      sortable: 'custom'
    },

    {
      type: 'custom-header',
      slotName: 'filename',
      label: '发票文件名',
      prop: 'filename',
      width: '320',
      showOverflowTooltip: true
    },

    {
      type: 'custom',
      slotName: 'mail_status',
      label: '发送状态',
      prop: 'mail_status',
      width: '120',
      sortable: 'custom'
    },

    {
      type: 'custom',
      slotName: 'receivable_date',
      label: '应收日期',
      prop: 'receivable_date',
      width: '120',
      showOverflowTooltip: true,
      sortable: 'custom'
    },

    {
      type: 'custom-header',
      slotName: 'amount_received',
      label: '收款金额',
      prop: 'amount_received',
      width: '140',
      sortable: 'custom'
    },

    {
      type: 'custom-header',
      slotName: 'amount_diff',
      label: '差额',
      prop: 'amount_diff',
      width: '100',
      sortable: 'custom'
    },

    {
      type: 'custom-menu',
      slotName: 'payment_status',
      label: '收款状态',
      prop: 'payment_status',
      width: '100'
    },

    {
      type: 'timer',
      label: '创建时间',
      prop: 'createAt',
      width: '150',
      showOverflowTooltip: true
    },

    {
      label: '实收日期',
      prop: 'confirmed_date',
      width: '170',
      sortable: 'custom'
    },

    {
      label: '创建人',
      prop: 'creator_name',
      width: '100'
    },

    {
      type: 'send-handler',
      label: '操作',
      width: '100'
    }
  ]
}

export default contentConfig
