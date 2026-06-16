Bord::Engine.routes.draw do
  root to: "widgets#index"

  resource :data, only: :show, controller: "widgets"

  resources :actions, only: :create

  resources :pages, only: :show do
    resources :records, only: :show
  end
end
