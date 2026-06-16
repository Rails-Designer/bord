module Bord
  class Action
    def self.run(params)
      record = GlobalID::Locator.locate(params[:record]) or raise ActiveRecord::RecordNotFound
      record.public_send(params[:method], **ActionParameters.from(params))
    end
  end
end
