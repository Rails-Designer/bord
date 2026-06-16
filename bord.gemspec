require_relative "lib/bord/version"

Gem::Specification.new do |spec|
  spec.name = "bord"
  spec.version = Bord::VERSION
  spec.authors = ["Rails Designer"]
  spec.email = ["developers@railsdesigner.com"]
  spec.homepage = "https://railsdesigner.com/open-source/bord/"
  spec.summary = "A Rails engine for configurable dashboard widgets."
  spec.description = "Bord provides a dashboard at /bord with metrics, lists, sections, record pages and server-side actions."
  spec.license = "MIT"
  spec.required_ruby_version = ">= 3.4"

  spec.metadata["allowed_push_host"] = "https://rubygems.org"
  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = "https://github.com/railsdesigner/bord"
  spec.metadata["changelog_uri"] = "https://github.com/railsdesigner/bord/releases"

  spec.files = Dir.chdir(File.expand_path(__dir__)) do
    Dir["{app,config,db,lib}/**/*", "MIT-LICENSE", "Rakefile", "README.md"]
  end

  spec.add_dependency "rails", ">= 7.1.0"
end
