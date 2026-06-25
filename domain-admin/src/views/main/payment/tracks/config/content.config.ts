const contentConfig = {
  pageName: 'payment_tracks',
  border: true,
  header: {
    title: '付款追踪',
    btnTitle: '新增记录'
  },
  propsList: [
    {
      label: '序号',
      width: '60',
      prop: 'id'
    },
    {
      label: 'ID',
      prop: 'row_id',
      width: '60',
      align: 'center',
      hidden: true
    },
    {
      type: 'custom',
      label: '备注',
      prop: 'remark',
      slotName: 'remark',
      width: '230'
    },
    {
      label: '客户简称',
      prop: 'short_name',
      width: '100',
      showOverflowTooltip: true
    },
    {
      type: 'custom',
      label: '月份',
      prop: 'period_month',
      slotName: 'period_month',
      width: '70'
    },
    {
      type: 'custom',
      label: '年份',
      prop: 'period_year',
      slotName: 'period_year',
      width: '70'
    },
    {
      type: 'custom',
      label: '应付金额',
      prop: 'amount',
      slotName: 'amount',
      width: '110'
    },
    {
      type: 'custom',
      label: '状态',
      prop: 'payment_status',
      slotName: 'payment_status',
      width: '120'
    },
    {
      type: 'custom',
      label: '已付金额',
      prop: 'amount_paid',
      slotName: 'amount_paid',
      width: '110'
    },
    {
      label: '应付日期',
      prop: 'payable_date',
      width: '110'
    },
    {
      type: 'custom',
      label: '付款主体',
      prop: 'payment_entity',
      slotName: 'payment_entity',
      width: '120'
    },
    {
      type: 'custom',
      label: '发票',
      prop: 'attachments',
      slotName: 'attachments',
      width: '170'
    },
    {
      type: 'custom',
      label: '水单',
      prop: 'vouchers',
      slotName: 'vouchers',
      width: '170'
    },
    {
      type: 'custom',
      label: '周期',
      prop: 'period',
      slotName: 'period',
      width: '210',
      showOverflowTooltip: true
    },
    {
      type: 'custom',
      label: '币种',
      prop: 'currency',
      slotName: 'currency',
      width: '100'
    },
    {
      label: '差额',
      prop: 'amount_diff',
      width: '130'
    },
    {
      label: '确认日期',
      prop: 'confirmed_date',
      width: '170'
    },
    {
      label: '创建人',
      prop: 'creator_name',
      width: '80'
    },
    {
      label: '创建时间',
      prop: 'createAt',
      width: '170'
    },
    {
      type: 'handler',
      label: '操作',
      width: '80'
    }
  ]
}

export default contentConfig
