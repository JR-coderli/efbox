const modalConfig = {
  pageName: 'invoiceentity',
  labelWidth: '110px',
  header: {
    newTitle: '新建开票主体',
    editTitle: '编辑开票主体',
  },
  formItems: [
    {
      type: 'input',
      label: '主体名称',
      prop: 'name',
      placeholder: '请输入主体名称(如: Eflow 云汇)',
      required: true
    },
    {
      type: 'input',
      label: '账户名称',
      prop: 'account_name',
      placeholder: 'Account Name',
      required: true
    },
    {
      type: 'input',
      label: '账户号码',
      prop: 'account_number',
      placeholder: 'Account Number',
      required: true
    },
    {
      type: 'input',
      label: '银行名称',
      prop: 'bank_name',
      placeholder: 'Bank Name',
      required: true
    },
    {
      type: 'input',
      label: 'SWIFT代码',
      prop: 'swift_code',
      placeholder: 'SWIFT Code',
      required: true
    },
    {
      type: 'input',
      label: '银行代码',
      prop: 'bank_code',
      placeholder: 'Bank Code',
      required: true
    },
    {
      type: 'input',
      label: '分行代码',
      prop: 'branch_code',
      placeholder: 'Branch Code',
      required: true
    },
    {
      type: 'textarea',
      label: '公司地址',
      prop: 'company_address',
      placeholder: 'Company Address',
      autosize: { minRows: 2, maxRows: 4 },
      required: true
    },
    {
      type: 'textarea',
      label: '银行地址',
      prop: 'bank_address',
      placeholder: 'Bank Address',
      autosize: { minRows: 2, maxRows: 4 },
      required: true
    },
    {
      type: 'input',
      label: '模板路径',
      prop: 'template_path',
      placeholder: '模板文件名, 可留空'
    },
    {
      type: 'input',
      label: '公司标题',
      prop: 'company_title',
      placeholder: '邮件正文中的品牌名, 如 Eflow Media; 留空则按主体名称自动匹配'
    },
    {
      type: 'select',
      label: '发送邮箱',
      prop: 'sender_mail',
      placeholder: '请选择发件邮箱',
      required: true,
      options: [
        { label: 'Eflow（notice@eflow-media.com）', value: 'eflow' },
        { label: 'Terra（notice@mail.terra-ads.com）', value: 'terra' }
      ]
    }
  ]
}

export default modalConfig
