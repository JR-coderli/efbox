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
      placeholder: 'Account Name'
    },
    {
      type: 'input',
      label: '账户号码',
      prop: 'account_number',
      placeholder: 'Account Number'
    },
    {
      type: 'input',
      label: '银行名称',
      prop: 'bank_name',
      placeholder: 'Bank Name'
    },
    {
      type: 'input',
      label: 'SWIFT代码',
      prop: 'swift_code',
      placeholder: 'SWIFT Code'
    },
    {
      type: 'input',
      label: '银行代码',
      prop: 'bank_code',
      placeholder: 'Bank Code'
    },
    {
      type: 'input',
      label: '分行代码',
      prop: 'branch_code',
      placeholder: 'Branch Code'
    },
    {
      type: 'textarea',
      label: '公司地址',
      prop: 'company_address',
      placeholder: 'Company Address',
      autosize: { minRows: 2, maxRows: 4 }
    },
    {
      type: 'textarea',
      label: '银行地址',
      prop: 'bank_address',
      placeholder: 'Bank Address',
      autosize: { minRows: 2, maxRows: 4 }
    },
    {
      type: 'input',
      label: '模板路径',
      prop: 'template_path',
      placeholder: '模板文件名, 可留空'
    }
  ]
}

export default modalConfig
