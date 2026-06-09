const modalConfig = {
  pageName: 'payment_tracks',
  labelWidth: '90px',
  header: {
    newTitle: '新建付款追踪',
    editTitle: '编辑付款追踪',
  },
  formItems: [
    {
      type: 'select',
      label: '付款客户',
      prop: 'customer_id',
      placeholder: '请选择客户',
      options: []
    },
    {
      type: 'select-create',
      label: '付款主体',
      prop: 'payment_entity',
      placeholder: '选择或输入付款主体'
    },
    {
      type: 'select-create',
      label: '币种',
      prop: 'currency',
      placeholder: '选择或输入币种'
    },
    {
      type: 'daterange',
      label: '周期',
      prop: 'period',
      placeholder: '请选择日期范围'
    },
    {
      type: 'number',
      label: '应付金额',
      prop: 'amount',
      placeholder: '请输入应付金额'
    },
    {
      type: 'textarea',
      label: '备注',
      prop: 'remark',
      placeholder: '请输入备注'
    }
  ]
}

export default modalConfig
