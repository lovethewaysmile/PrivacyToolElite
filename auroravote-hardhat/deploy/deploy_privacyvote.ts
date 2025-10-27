import type { DeployFunction } from "hardhat-deploy/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("AuroraVoteHub", {
    from: deployer,
    log: true,
    args: [],
    waitConfirmations: 1,
  });
};

export default func;
func.id = "deploy_auroravote";
func.tags = ["AuroraVoteHub"];


