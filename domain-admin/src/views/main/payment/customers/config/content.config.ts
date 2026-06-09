const contentConfig = {
  pageName: 'payment_customers',
  border: true, // 表格是否显示边框
  header: {
    title: '客户列表',
    btnTitle: '新增客户'
  },
  propsList: [
    {
      label: '序号',
      width: '60',
      prop: 'id'
    },
    {
      label: '客户全称',
      prop: 'full_name',
      width: "200",
      showOverflowTooltip: true
    },
    {
      label: '客户简称',
      prop: 'short_name',
      width: '100'
    },
    {
      label: '公司地址',
      prop: 'company_address',
      width: '200',
      showOverflowTooltip: true
    },
    {
      type: 'custom',
      label: '接收邮箱',
      prop: 'send_emails',
      slotName: 'send_emails',
      width: '200'
    },
    {
      type: 'custom',
      label: '其他邮箱',
      prop: 'normal_emails',
      slotName: 'normal_emails',
      width: '200'
    },
    {
      type: 'timer',
      label: '创建时间',
      prop: 'createAt',
      width: '160'
    },
    {
      type: 'custom',
      slotName: 'payment_cycle_days',
      label: '付款周期',
      prop: 'payment_cycle_days',
      width: '110'
    },
    {
      type: 'custom',
      slotName: 'remark',
      label: '注意事项',
      prop: 'remark',
      width: '180'
    }
  ]
}

export default contentConfig
