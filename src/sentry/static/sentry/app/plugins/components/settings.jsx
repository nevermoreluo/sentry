import PropTypes from 'prop-types';
import React from 'react';
import _ from 'lodash';

import {Form, FormState} from '../../components/forms';
import PluginComponentBase from '../../components/bases/pluginComponentBase';
import LoadingIndicator from '../../components/loadingIndicator';
import {t, tct} from '../../locale';
import {parseRepo} from '../../utils';

class PluginSettings extends PluginComponentBase {
  constructor(props, context) {
    super(props, context);

    Object.assign(this.state, {
      fieldList: null,
      initialData: null,
      formData: null,
      errors: {},
      rawData: {},
      // override default FormState.READY if api requests are
      // necessary to even load the form
      state: FormState.LOADING
    });
  }

  componentDidMount() {
    this.fetchData();
  }

  getPluginEndpoint() {
    let org = this.props.organization;
    let project = this.props.project;
    return `/projects/${org.slug}/${project.slug}/plugins/${this.props.plugin.id}/`;
  }

  changeField(name, value) {
    let formData = this.state.formData;
    formData[name] = value;
    // upon changing a field, remove errors
    let errors = this.state.errors;
    delete errors[name];
    this.setState({formData, errors});
  }

  onSubmit() {
    let repo = this.state.formData.repo;
    repo = repo && parseRepo(repo);
    let parsedFormData = {...this.state.formData, repo};
    this.api.request(this.getPluginEndpoint(), {
      data: parsedFormData,
      method: 'PUT',
      success: this.onSaveSuccess.bind(this, data => {
        let formData = {};
        let initialData = {};
        data.config.forEach(field => {
          formData[field.name] = field.value || field.defaultValue;
          initialData[field.name] = field.value;
        });
        this.setState({
          fieldList: data.config,
          formData,
          initialData,
          errors: {}
        });
      }),
      error: this.onSaveError.bind(this, error => {
        this.setState({
          errors: (error.responseJSON || {}).errors || {}
        });
      }),
      complete: this.onSaveComplete
    });
  }

  fetchData() {
    this.api.request(this.getPluginEndpoint(), {
      success: data => {
        if (!data.config) {
          this.setState(
            {
              rawData: data
            },
            this.onLoadSuccess
          );
          return;
        }
        let formData = {};
        let initialData = {};
        data.config.forEach(field => {
          formData[field.name] = field.value || field.defaultValue;
          initialData[field.name] = field.value;
        });
        this.setState(
          {
            fieldList: data.config,
            formData,
            initialData
            // call this here to prevent FormState.READY from being
            // set before fieldList is
          },
          this.onLoadSuccess
        );
      },
      error: this.onLoadError
    });
  }

  render() {
    if (this.state.state === FormState.LOADING) {
      return <LoadingIndicator />;
    }
    let isSaving = this.state.state === FormState.SAVING;
    let hasChanges = !_.isEqual(this.state.initialData, this.state.formData);

    let data = this.state.rawData;
    if (data.config_error) {
      let authUrl = data.auth_url;
      if (authUrl.indexOf('?') === -1) {
        authUrl += '?next=' + encodeURIComponent(document.location.pathname);
      } else {
        authUrl += '&next=' + encodeURIComponent(document.location.pathname);
      }
      return (
        <div className="m-b-1">
          <div className="alert alert-warning m-b-1">
            {data.config_error}
          </div>
          <a className="btn btn-primary" href={authUrl}>
            {t('Associate Identity')}
          </a>
        </div>
      );
    }

    if (this.state.state === FormState.ERROR && !this.state.fieldList) {
      return (
        <div className="alert alert-error m-b-1">
          {tct('An unknown error occurred. Need help with this? [link:Contact support]', {
            link: <a href="https://sentry.io/support/" />
          })}
        </div>
      );
    }

    if (!(this.state.fieldList || []).length) {
      return null;
    }
    return (
      <Form onSubmit={this.onSubmit} submitDisabled={isSaving || !hasChanges}>
        {this.state.errors.__all__ &&
          <div className="alert alert-block alert-error">
            <ul>
              <li>{this.state.errors.__all__}</li>
            </ul>
          </div>}
        {this.state.fieldList.map(f => {
          return this.renderField({
            key: f.name,
            config: f,
            formData: this.state.formData,
            formErrors: this.state.errors,
            onChange: this.changeField.bind(this, f.name)
          });
        })}
      </Form>
    );
  }
}

PluginSettings.propTypes = {
  organization: PropTypes.object.isRequired,
  project: PropTypes.object.isRequired,
  plugin: PropTypes.object.isRequired
};

export default PluginSettings;
