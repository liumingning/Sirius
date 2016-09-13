import React from 'react'
import ReactDOM from 'react-dom'
import echarts from 'echarts'
import Percentage from 'bfd-ui/lib/Percentage'
import Button from 'bfd-ui/lib/Button'
import ButtonGroup from 'bfd-ui/lib/ButtonGroup'

import NavigationInPage from 'public/NavigationInPage'
import Toolkit from 'public/Toolkit/index.js'

import CMDR from '../CalcManageDataRequester/requester.js'
import CalcManageConf from '../UrlConf'

import './index.less'


/**
 * 页面大改：
 * 饼图只保留 Pod的已创建个数和最大创建个数，其它的删掉
 * 线图变更为四个：
 *    集群CPU使用率
 *    集群内存使用率
 *    集群网络使用情况
 *    集群FileSystem使用情况
 * 页面可以参考：
 *    http://grafana.bfdcloud.com/          （Cluster显示集群的信息，Pods显示Pod的信息）
 *    http://k8sinflux.bfdcloud.com/
 * 
 * 其中的一些字段的含义：
 *    Request：申请的量
 *    Limit：实际分配的量
 *    Usage：实际使用的量
 * influxdb官方提供的dashboard
 *    http://k8sinflux.bfdcloud.com/
 *    http://k8sinfluxapi.bfdcloud.com/ , 80
 *        账号 admin
 *        密码 admin
 * 
 * 
 */



var mod = React.createClass({
  /**
  getInitialState:function(){
    return CMDR.generateRandomData()
  },
  load_data(dataDict){
    console.dir(dataDict)
    this.setState({
      pod_used:dataDict['pod_used'],
      pod_total:dataDict['pod_total'],
      task_used:dataDict['task_used'],
      task_total:dataDict['task_total'],
      memory_used:dataDict['memory_used'],
      memory_total:dataDict['memory_total'],
      load_data_points:dataDict['load_data_points'],
      flowrate_data_points:dataDict['flowrate_data_points']
    })
    
  },
  formatPercent(used,total){
    return (total == 0) ? 100 : parseInt( 100 * used / total)
  },
  selectColorByPercent(percent){
    if (percent <= 33.33){
      return '#1CB162'
    }else if (percent <= 66.66){
      return '#1BB8FA'
    }else {
      return '#FA7252'
    }
  }, */

  componentDidMount(){
    this.userData = {}
    this.initUserData()

    this.initCharts()
    this.requestClusterInfoData()

    this.calcDesiredSize()
    window.onresize = ()=>{ this.onWindowResize() }
  },

  onWindowResize(){
    window.onresize = undefined
    this.calcDesiredSize()
    window.onresize = ()=>{ this.onWindowResize() }
  },

  calcRootDivSize(){
    let totalHeight = document.body.clientHeight
    totalHeight -= document.getElementById('header').clientHeight
    totalHeight -= document.getElementById('footer').clientHeight
    totalHeight -= 20*2               // 去掉设置的子页面padding

    let totalWidth = document.getElementById('body').childNodes[1].clientWidth
    totalWidth -= 20*2

    return { 'width':totalWidth,'height':totalHeight }
  },

  calcDesiredSize(){
    let rootSize = this.calcRootDivSize()
    let rootDivHeight = rootSize['height']
    let rootDivWidth = rootSize['width']

    let rootDivObj = ReactDOM.findDOMNode(this.refs.MyCalcManagerOverviewChildRootDiv)
    rootDivObj.style.height = (rootDivHeight+'px')

    let height = rootDivHeight - ReactDOM.findDOMNode(this.refs.NavigationInPage).clientHeight
    let table = ReactDOM.findDOMNode(this.refs.EchartFatherDiv)
    table.childNodes[0].style.height = (height + 'px')
    table.childNodes[0].style.width = (rootDivWidth + 'px')

    // 窗口大小改变之后，需要调用echart对象的resize函数，使其适应新的宽度
    for ( let i = 0 ; i < this.userData['clusterInfoTypes'].length ; i ++ ){
      this.userData['echartObj'][ this.userData['clusterInfoTypes'][i] ].resize()
    }
  },

  initUserData(){
    this.userData['clusterInfoTypes'] = ['cpu','memory','network','filesystem']

    this.userData['echartObj'] = {}

    this.userData['clusterInfoDict'] = {
      'cpu':'EchartCPUInfoDiv',
      'memory':'EchartMemoryInfoDiv',
      'network':'EchartNetworkInfoDiv',
      'filesystem':'EchartFilesystemInfoDiv'
    }

    // 将url请求与回调都放到一起，便于管理
    this.userData['clusterInfoCallBackFunc'] = {
      'cpu':        ( value )=>{ 
                      CMDR.getClusterCPUInfo( value,(executedData)=>{
                        this.insertDataToChart( 'cpu',executedData )
                      })  
                    },
      'memory':     ( value )=>{ 
                      CMDR.getClusterMemoryInfo( value,(executedData)=>{
                        this.insertDataToChart( 'memory',executedData )
                      })
                    },
      'network':    ( value )=>{ 
                      CMDR.getClusterNetworkInfo( value,(executedData)=>{
                        this.insertDataToChart( 'network',executedData )
                      })  
                    },
      'filesystem': ( value )=>{ 
                      CMDR.getClusterFilesystemInfo( value ,(executedData)=>{
                        this.insertDataToChart( 'filesystem',executedData )
                      })
                    },
    }

    this.userData['tooltipFormatterFunc'] = {
      'cpu':        ( params, ticket, callback ) => {
                      let templateStr = this.generateTooltipFormatterStr(3)
                      let unitArr = ['','K','M','G','T','P']
                      return this.tooltipFormatter( templateStr,params,1000,unitArr,0 )
                    },
      'memory':     ( params, ticket, callback ) => {
                      let templateStr = this.generateTooltipFormatterStr(4)
                      let unitArr = ['B','KB','MB','GB','TB','PB']
                      return this.tooltipFormatter( templateStr,params,1000,unitArr,2 )
                    },
      'network':    ( params, ticket, callback ) => {
                      let templateStr = this.generateTooltipFormatterStr(2)
                      let unitArr = ['Bps','KBps','MBps','GBps','TBps','PBps']
                      return this.tooltipFormatter( templateStr,params,1000,unitArr,2 )
                    },
      'filesystem': ( params, ticket, callback ) => {
                      let templateStr = this.generateTooltipFormatterStr(2)
                      let unitArr = ['B','KB','MB','GB','TB','PB']
                      return this.tooltipFormatter( templateStr,params,1000,unitArr,2 )                      
                    }
    }

    this.userData['yAxisLabelFormatter'] = {
      'cpu':        (value,index) => {
                      let unitArr = ['','K','M','G','T','P']
                      return Toolkit.unitConversion( value,1000,unitArr,0 )
                    },
      'memory':     (value,index) => {
                      let unitArr = ['B','KB','MB','GB','TB','PB']
                      return Toolkit.unitConversion( value,1000,unitArr,2 )
                    },
      'network':    (value,index) => {
                      let unitArr = ['Bps','KBps','MBps','GBps','TBps','PBps']
                      return Toolkit.unitConversion( value,1000,unitArr,2 )
                    },
      'filesystem': (value,index) => {
                      let unitArr = ['B','KB','MB','GB','TB','PB']
                      return Toolkit.unitConversion( value,1000,unitArr,2 )
                    }
    }
    
    // 绘制集群信息图表的时候，将从以下颜色池中选择颜色
    this.userData['colorPoll'] = [{
      'line':'rgb(229,115,115)',
      'area':'rgba(229,115,115,0.1)'
    },{
      'line':'rgb(126,87,194)',
      'area':'rgba(126,87,194,0.1)'
    },{
      'line':'rgb(77,208,225)',
      'area':'rgba(77,208,225,0.1)'
    },{      
      'line':'rgb(121,134,203)',
      'area':'rgba(121,134,203,0.1)'
    },{
      'line':'rgb(212,225,87)',
      'area':'rgba(212,225,87,0.1)'
    },{
      'line':'rgb(38,166,154)',
      'area':'rgba(38,166,154,0.1)'
    },{
      'line':'rgb(253,216,53)',
      'area':'rgba(253,216,53,0.1)'
    },{
      'line':'rgb(255,138,101)',
      'area':'rgba(255,138,101,0.1)'
    },{
      'line':'rgb(66,165,245)',
      'area':'rgba(66,165,245,0.1)'
    },{
      'line':'rgb(102,187,106)',
      'area':'rgba(102,187,106,0.1)'
    }]
  },

  // 生成用于显示tooltip的html文本结构
  generateTooltipFormatterStr( seriesNumber ){
    let templateStr = '<tr><td>{time}</td></tr>'
    for ( let i = 0 ; i < seriesNumber ; i ++ ){
      templateStr += '<tr>'
      templateStr += '<td>{seriesName'+i+'}</td>'
      templateStr += '<td class="SpaceTdDistraction"></td>'
      templateStr += '<td>{seriesValue'+i+'}</td>'
      templateStr += '</tr>'
    }
    return '<table class="TooltipTable"><tbody>' + templateStr + '</tbody></table>'
  },

  tooltipFormatter( templateStr,params,hex,unitArr,significantFractionBit ){
    let dataObj = {}
    dataObj['time'] = params[0]['name']
    for ( let i = 0 ; i < params.length ; i ++ ){
      dataObj['seriesName'+i] = params[i]['seriesName']
      dataObj['seriesValue'+i] = Toolkit.unitConversion( params[i]['value'],hex,unitArr,significantFractionBit )
    }
    return Toolkit.strFormatter.formatString( templateStr,dataObj)
  },

  initCharts(){
    for ( let identifyStr in this.userData['clusterInfoDict'] ){
      this.userData['echartObj'][identifyStr] = echarts.init(document.getElementById( this.userData['clusterInfoDict'][identifyStr] ))

      // 在没有加载到数据的时候，先显示出来空白的图标，这样会比较好看
      let initOptions = {
        'title': { 
          'text': Toolkit.strFormatter.formatString('集群 {chartName} 使用情况',{ 'chartName':identifyStr })
        },
        'tooltip' : {
          'trigger': 'axis',
          'formatter': this.userData['tooltipFormatterFunc'][identifyStr]
        },
        'xAxis': [{
          'type' : 'category',
          'data': []
        }],
        'yAxis':{
          'axisLabel':{
            'show':true,
            'formatter':this.userData['yAxisLabelFormatter'][identifyStr]
          }
        },
      }
      this.userData['echartObj'][identifyStr].setOption(initOptions)
    }
  },

  generateLineSeriesObj( lineName,dataArr ){
    let obj = {
      type: 'line',
      itemStyle: {
        normal: {
          lineStyle:{  color: 'rgba(255,0,0)'   },
          areaStyle:{  color: 'rgba(255,0,0,0.1)' , type: 'default'  }
        }
      },    
      name: lineName,
      data: dataArr
    }
    return obj
  },

  insertDataToChart( chartName,executedData ){
    this.userData['echartObj'][chartName].hideLoading()

    let series = []
    let legend = []
    for ( let i = 0 ; i < executedData.series.length ; i ++ ){
      legend.push( executedData['series'][i]['legend'] )

      let seriesDataObj = this.generateLineSeriesObj( executedData['series'][i]['legend'],executedData['series'][i]['data'] )
      seriesDataObj['itemStyle']['normal']['lineStyle']['color'] = this.userData['colorPoll'][i]['line']        // 线颜色
      seriesDataObj['itemStyle']['normal']['areaStyle']['color'] = this.userData['colorPoll'][i]['area']        // 区域颜色
      series.push( seriesDataObj )
    }

    this.userData['echartObj'][chartName].setOption({
      'legend': { 
        'data':legend
      },
      'xAxis': {
        'type' : 'category',
        'position' : 'bottom',
        'boundaryGap': false,
        'data': executedData['xaxis']
      },
      'series': series
    })
  },

  onTimeRangeChanged( value,clusterInfoType ){
    this.userData['echartObj'][clusterInfoType].showLoading()
    this.userData['clusterInfoCallBackFunc'][clusterInfoType]( value )
  },

  requestClusterInfoData(){
    for ( let i = 0 ; i < this.userData['clusterInfoTypes'].length ; i ++ ){
      this.onTimeRangeChanged( 60,this.userData['clusterInfoTypes'][i] )
    }
  },
  
  render: function() {
    /** 
    let pod_percent = this.formatPercent( this.state.pod_used,this.state.pod_total )
    let task_percent = this.formatPercent( this.state.task_used,this.state.task_total)
    let memory_percent = this.formatPercent( this.state.memory_used,this.state.memory_total)
    */

    let ClusterInfoKeyWord = [ { 'type':'Button',   'str':'cpu'                   },
                               { 'type':'Echart',   'str':'EchartCPUInfoDiv'      },
                               { 'type':'Button',   'str':'memory'                },
                               { 'type':'Echart',   'str':'EchartMemoryInfoDiv'   },
                               { 'type':'Button',   'str':'network'               },
                               { 'type':'Echart',   'str':'EchartNetworkInfoDiv'  },
                               { 'type':'Button',   'str':'filesystem'            },
                               { 'type':'Echart',   'str':'EchartFilesystemInfoDiv'  }]

    return (
      <div className="MyCalcManagerOverviewChildRootDiv" 
           ref="MyCalcManagerOverviewChildRootDiv">
          <NavigationInPage ref="NavigationInPage"
                          headText={CalcManageConf.getNavigationData({
                            pageName:'Overview',
                            type : 'headText'
                          })} 
                          naviTexts={CalcManageConf.getNavigationData({
                            pageName:'Overview',
                            type:'navigationTexts',
                            spaceName:CalcManageConf.getCurSpace(this)
                          })} />
          <table className="EchartFatherDiv" ref="EchartFatherDiv">
            <tbody>
              {ClusterInfoKeyWord.map( (keyword)=>{
                if ( keyword['type'] === 'Button' ){
                  return (
                    <tr key={Toolkit.generateGUID()}>
                      <td>
                        <ButtonGroup defaultValue="60" 
                            onClick= {(value)=>{this.onTimeRangeChanged(value,keyword['str'])}} 
                            onChange={(value)=>{this.onTimeRangeChanged(value,keyword['str'])}}  >
                          <Button value={60}   >最近1小时</Button>
                          <Button value={60*6} >最近6小时</Button>
                          <Button value={60*24}>最近1天</Button>
                        </ButtonGroup>
                      </td>
                    </tr>
                  )
                } else {
                  return (
                    <tr key={Toolkit.generateGUID()}>
                      <td><div id={keyword['str']} ref={keyword['str']} /></td>
                    </tr>
                  )
                }
              } )}
            </tbody>
          </table>

            
            
            

          {/** 
          <table className="PercentageFatherDiv" style={{'display':'none'}}>
            <tbody>
              <tr className="PercentPic">
                <td>
                  <Percentage percent={pod_percent} 
                              foreColor={this.selectColorByPercent(pod_percent)} 
                              textColor={this.selectColorByPercent(pod_percent)} 
                              style={{width: '150px'}} 
                              ref="pod_percent" />
                </td>
                <td>
                  <Percentage percent={task_percent} 
                              foreColor={this.selectColorByPercent(task_percent)} 
                              textColor={this.selectColorByPercent(task_percent)} 
                              style={{width: '150px'}} 
                              ref="task_percent" />
                </td>
                <td>
                  <Percentage percent={memory_percent} 
                              foreColor={this.selectColorByPercent(memory_percent)} 
                              textColor={this.selectColorByPercent(memory_percent)} 
                              style={{width: '150px'}} 
                              ref="memory_percent" />
                </td>
              </tr>
              <tr className="PercentText">
                <td>Pod</td>
                <td>计算任务</td>
                <td>内存</td>
              </tr>
              <tr className="PercentDetail">
                <td>{this.state.pod_used}&nbsp;/&nbsp;{this.state.pod_total}</td>
                <td>{this.state.task_used}&nbsp;/&nbsp;{this.state.task_total}</td>
                <td>{this.state.memory_used}&nbsp;/&nbsp;{this.state.memory_total}</td>
              </tr>
            </tbody>
          </table>*/}
      </div>
    )
  }
});


export default mod;