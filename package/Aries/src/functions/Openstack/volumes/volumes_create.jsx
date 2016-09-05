import { Form, FormItem } from 'bfd-ui/lib/Form'
import FormInput from 'bfd-ui/lib/FormInput'
import FormTextarea from 'bfd-ui/lib/FormTextarea'
import { FormSelect, Option } from 'bfd-ui/lib/FormSelect'
import message from 'bfd-ui/lib/message'
import React from 'react'
import { Modal, ModalHeader, ModalBody } from 'bfd-ui/lib/Modal'
import Button from 'bfd-ui/lib/Button'

const Create_volumes=React.createClass({
  getInitialState() {
    this.rules = {
      name(v) {
        if (!v) return '请填写用户群'
      },
      date(v) {
        if (!v) return '日期不能为空'
      }
    }
    return {
      formData: {
        brand: 0
      }
    }
  },

  handleDateSelect(date) {
    const formData = this.state.formData
    formData.date = date
    this.setState({ formData })
  },

  handleSave() {
    console.log(this.state.formData)
    this.refs.form.save()
  },

  handleSuccess(res) {
    console.log(res)
    message.success('保存成功！')
  },
  handleOpen() {
    this.refs.modal_m.open()
  },

  render() {
    const { formData } = this.state
    return (
      <div style={{float:"left",margin: "0px 10px 0px 10px"}}>
      <button className="btn btn-primary" onClick={this.handleOpen}>创建</button>
        <Modal ref="modal_m">
          <ModalHeader>
            <h4>test</h4>
          </ModalHeader>
          <ModalBody>
            <Form 
              ref="form" 
              action="/api/form" 
              data={formData} 
              rules={this.rules} 
              onSuccess={this.handleSuccess}
            >
              <FormItem label="名称" required name="name">
                <FormInput style={{width: '200px'}}></FormInput>
              </FormItem>
              <FormItem label="数量" required name="count" >
                <FormInput style={{width: '200px'}}></FormInput>
              </FormItem>
              <FormItem label="类型" name="type">
                <FormSelect style={{width: '200px'}}>
                  <Option>请选择</Option>
                  <Option value={0}>ceph</Option>
                </FormSelect>
              </FormItem>
              <FormItem label="容量" required name="size">
                <FormInput style={{width: '200px'}}></FormInput>
              </FormItem>
              <button type="button" style={{marginLeft: '100px'}} className="btn btn-primary" onClick={this.handleSave}>保存</button>
            </Form>
        </ModalBody>
        </Modal>
      </div>
    )
  }
})

export {Create_volumes}