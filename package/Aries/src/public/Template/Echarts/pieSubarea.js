//饼图分区模版数据
import common from './common'
const pieSubarea = {
  option:  {
    legend: {
        orient: 'vertical',
        x: 'left',
    },
    hoverAnimation:false,
    series: [{
        type: 'pie',
        center: ['50%','50%'],
        radius: ['50%', '80%'],
        data: "${data}"
    }]
  },
  formtarData(data){
    return data.map((item,index)=>{
      return {
          value: item.value,
          name: item.name,
          label: {
              normal: {
                  show: false
              }
          },
          labelLine: {
            normal: {
              show: false
            }
          }
      }
    });
  },
  //渲染option的函数
  renderOption(data){
    data = this.formtarData(data);
    console.log(data);
    let option = common.tempPreHandler(this.option,{data:data});
    console.log(option);
    return option;
  }
}

export default pieSubarea;
