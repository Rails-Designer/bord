Rails.application.routes.draw do
  mount Bord::Engine => "/bord"

  root to: ->(env) { [200, {}, ["<a href='/bord'>Bord</a>"]] }
end
