const contentConfig = {
  pageName: 'invoiceentity',
  border: true,
  header: {
    title: '开票主体列表',
    btnTitle: '开票主体'
  },
  propsList: [
    {
      label: '序号',
      width: '60',
      prop: 'id'
    },
    {
      label: '主体名称',
      prop: 'name',
      width: '150',
      showOverflowTooltip: true
    },
    {
      label: '账户名称',
      prop: 'account_name',
      width: '150',
      showOverflowTooltip: true
    },
    {
      label: '账户号码',
      prop: 'account_number',
      width: '120'
    },
    {
      label: '银行名称',
      prop: 'bank_name',
      width: '180',
      showOverflowTooltip: true
    },
    {
      label: 'SWIFT代码',
      prop: 'swift_code',
      width: '100'
    },
    {
      label: '银行代码',
      prop: 'bank_code',
      width: '90'
    },
    {
      label: '分行代码',
      prop: 'branch_code',
      width: '90'
    },
    {
      label: '公司地址',
      prop: 'company_address',
      width: '200',
      showOverflowTooltip: true
    },
    {
      label: '银行地址',
      prop: 'bank_address',
      width: '200',
      showOverflowTooltip: true
    },
    {
      label: '模板路径',
      prop: 'template_path',
      width: '180',
      showOverflowTooltip: true
    },
    {
      type: 'timer',
      label: '创建时间',
      prop: 'createAt',
      width: '160'
    },
    {
      type: 'handler',
      label: '操作',
      width: '80',
      align: 'center'
    }
  ]
}

export default contentConfig
