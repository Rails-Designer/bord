module Bord
  class RecordsController < ApplicationController
    def show
      @page = Page.find!(params[:page_id])
      @page.context = self
      @record = @page.find_record(params[:id])

      respond_to do |format|
        format.html
        format.json { render json: {actions: @page.decorate_record(@record, view_context: view_context).actions} }
      end
    end
  end
end
