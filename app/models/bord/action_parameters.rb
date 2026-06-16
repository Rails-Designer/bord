require "json"

module Bord
  module ActionParameters
    module_function

    def from(params)
      flattened = params
        .except(:controller, :action, :authenticity_token, :method, :record, :owner, :params, :format)
        .permit!
        .to_h
        .symbolize_keys

      nested = params[:params]
      nested = JSON.parse(nested) if nested.is_a?(String)
      flattened.merge((nested || {}).symbolize_keys)
    end
  end
end
