Vagrant::Config.run do |config|

  config.vm.box = "natty32"
  config.vm.box_url = "http://decafbad.com/2011/07/natty32.box"
  config.package.name = "tinkering-as.box"

  config.vm.network "33.33.33.46"
  config.vm.share_folder "v-root", "/vagrant", "."

  config.vm.provision :puppet do |puppet|
    puppet.manifests_path = "puppet/manifests"
    puppet.manifest_file  = "dev-vagrant.pp"
  end

  config.vm.customize do |vm|
    vm.memory_size = 768
  end

end
